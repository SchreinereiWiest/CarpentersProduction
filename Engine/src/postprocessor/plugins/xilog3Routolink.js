import { POSTPROCESSOR_API_VERSION } from "../contract.js";
import {
  MACHINING_INTENT_IDS,
  MACHINING_KINDS,
  assertNeutralPartCnc,
  translateNeutralPartForViewer
} from "../machiningModel.js";
import { DEFAULT_MACHINING_LOCATIONS, resolveProgramHeader } from "../programHeader.js";

const strategy = (id, label, operationKinds, description) => ({
  id,
  label,
  operationKinds,
  description
});

const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatNumber = (value) => {
  const number = finiteNumber(value);
  if (number === null) return null;
  const normalized = Math.abs(number) < 0.00005 ? 0 : number;
  return Number(normalized.toFixed(4)).toString();
};

const diagnostic = (level, code, message, operation = null) => ({
  level,
  code,
  message,
  ...(operation
    ? {
        operationId: operation.id ?? null,
        operationKind: operation.kind ?? null,
        intentId: operation.intentId ?? null
      }
    : {})
});

const partDimensions = (part) => ({
  x: finiteNumber(part?.L),
  y: finiteNumber(part?.B),
  z: finiteNumber(part?.T)
});

const programName = (value) => {
  const normalized = String(value || "PART")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return normalized || "PART";
};

const faceProgramName = (value, face) => {
  const base = programName(value);
  if (face !== "B") return base;
  const prefix = base.slice(0, 6).replace(/[-_]+$/g, "") || "PART";
  return `${prefix}_B`.slice(0, 8);
};

const setupName = (value) =>
  String(value || "W")
    .replace(/["\r\n]/g, "")
    .slice(0, 8) || "W";

const workingFields = (value) => {
  const fields = [
    ...new Set(
      String(value || "AD")
        .toUpperCase()
        .match(/[A-D]/g) ?? []
    )
  ];
  return fields.join("") || "AD";
};

const departureStep = (configuration, fields) => {
  const isFullField = fields.length === 2 && fields.includes("A") && fields.includes("D");
  const field = isFullField ? "AD" : "A";
  const configured = finiteNumber(
    isFullField
      ? configuration.departurePositionAD
      : configuration.departurePositionA
  );
  return {
    field,
    position: Math.max(0, configured ?? (isFullField ? 2800 : 1600))
  };
};

const transformY = (value, dimensions, configuration) => {
  const y = finiteNumber(value);
  if (y === null) return null;
  return configuration.flipYAxis === false ? y : dimensions.y - y;
};

const configuredTool = (operation, configuration, fallbackNumber) => {
  const tools = Array.isArray(configuration.toolDatabase)
    ? configuration.toolDatabase
    : [];
  const tool = tools.find(item => item.id === operation.toolId);
  return {
    number: finiteNumber(tool?.toolNumber ?? fallbackNumber),
    diameter: finiteNumber(tool?.diameter)
  };
};

const operationFaceSupported = (operation, programFace = "A") => {
  const operationFace = String(operation?.face || "A").toUpperCase();
  return operationFace === programFace || operationFace === "BOTH";
};

const xboLine = ({
  x,
  y,
  z,
  diameter,
  count = 1,
  xOffset = 0,
  yOffset = 0
}) => {
  const words = [
    "XBO",
    `X=${formatNumber(x)}`,
    `Y=${formatNumber(y)}`,
    `Z=${formatNumber(z)}`
  ];
  const repetitions = Math.max(1, Math.floor(finiteNumber(count) ?? 1));
  words.push(`R=${repetitions}`);
  if (repetitions > 1) {
    if (finiteNumber(xOffset) !== 0) words.push(`x=${formatNumber(xOffset)}`);
    if (finiteNumber(yOffset) !== 0) words.push(`y=${formatNumber(yOffset)}`);
  }
  words.push(`D=${formatNumber(diameter)}`, 'N="P"');
  return words.join(" ");
};

const translateDrill = (operation, dimensions, configuration) => {
  const x = finiteNumber(operation.x);
  const y = transformY(operation.y, dimensions, configuration);
  const z = finiteNumber(operation.depth ?? operation.z);
  const diameter = finiteNumber(operation.diameter);
  const count = operation.count ?? 1;
  const xOffset = finiteNumber(operation.stepX ?? 0);
  const sourceYOffset = finiteNumber(operation.stepY ?? operation.spacing ?? 0);
  const yOffset =
    configuration.flipYAxis === false ? sourceYOffset : -sourceYOffset;

  if ([x, y, z, diameter, xOffset, yOffset].some((value) => value === null))
    return null;
  if (operation.columns !== undefined || operation.rows !== undefined) {
    const columns = Math.max(1, Math.floor(finiteNumber(operation.columns) ?? 1));
    const rows = Math.max(1, Math.floor(finiteNumber(operation.rows) ?? 1));
    const sourceY = finiteNumber(operation.y);
    if (sourceY === null) return null;
    return Array.from({ length: rows }, (_, row) => xboLine({
      x,
      y: transformY(sourceY + row * sourceYOffset, dimensions, configuration),
      z,
      diameter,
      count: columns,
      xOffset,
      yOffset: 0
    }));
  }
  return [xboLine({ x, y, z, diameter, count, xOffset, yOffset })];
};

const connectorIntents = new Set([
  MACHINING_INTENT_IDS.JOINT_CONNECTOR,
  MACHINING_INTENT_IDS.JOINT_SCREW
]);

const isVerticalConnectorCycle = operation =>
  operation.kind === MACHINING_KINDS.DRILL_LINEAR_PATTERN &&
  connectorIntents.has(operation.intentId);

const translateVerticalConnector = (operation, dimensions) => {
  const x = finiteNumber(operation.x);
  const depth = finiteNumber(operation.depth ?? operation.z);
  const diameter = finiteNumber(operation.diameter);
  const configuredSpacing = finiteNumber(operation.spacing);
  const positions = Array.isArray(operation.positions)
    ? operation.positions.map(finiteNumber).filter(value => value !== null).sort((left, right) => left - right)
    : [];
  const start = positions[0] ?? finiteNumber(operation.y ?? operation.rowStart);
  const count = Math.max(1, Math.floor(finiteNumber(operation.count) ?? positions.length ?? 1));
  const spacing = configuredSpacing ?? (
    positions.length > 1
      ? positions[1] - positions[0]
      : 32
  );
  const last = positions.at(-1) ?? (
    start === null || spacing === null
      ? null
      : start + Math.max(0, count - 1) * spacing
  );
  const endOffset = finiteNumber(operation.rowEnd) ?? (
    last === null ? null : Math.max(0, dimensions.y - last)
  );

  if ([x, start, endOffset, depth, diameter, spacing].some(value => value === null)) {
    return null;
  }

  return [[
    "VB1",
    `X=${formatNumber(x)}`,
    `Y=${formatNumber(start)}`,
    `y=${formatNumber(endOffset)}`,
    `Z=${formatNumber(depth)}`,
    `R=${formatNumber(spacing)}`,
    `D=${formatNumber(diameter)}`
  ].join(" ")];
};

const translateGenericDrillRow = (operation, dimensions, configuration) => {
  const start = finiteNumber(operation.start);
  const end = finiteNumber(operation.end);
  const spacing = finiteNumber(operation.spacing);
  const z = finiteNumber(operation.depth ?? operation.z);
  const diameter = finiteNumber(operation.diameter);
  if (
    [start, end, spacing, z, diameter].some((value) => value === null) ||
    spacing <= 0 ||
    end < start
  ) {
    return null;
  }

  const count = Math.floor((end - start) / spacing + 0.0001) + 1;
  const rows = (Array.isArray(operation.crossPositions) ? operation.crossPositions : [])
    .map((value) => transformY(value, dimensions, configuration))
    .filter((value) => value !== null);
  if (rows.length === 0) return null;

  return [...new Set(rows)].map((y) =>
    xboLine({
      x: start,
      y,
      z,
      diameter,
      count,
      xOffset: spacing,
      yOffset: 0
    })
  );
};

const translateShelfRow = (operation, dimensions, configuration) => {
  const spacing = finiteNumber(operation.spacing);
  const isNativeShelfRow = operation.intentId === MACHINING_INTENT_IDS.SHELF_PIN_ROW &&
    spacing !== null && Math.abs(spacing - 32) <= 0.0001;
  if (!isNativeShelfRow) {
    return translateGenericDrillRow(operation, dimensions, configuration);
  }

  const centered = operation.centered === true || operation.source?.centered === true;
  const start = finiteNumber(centered ? operation.rangeStart ?? operation.start : operation.start);
  const end = finiteNumber(centered ? operation.rangeEnd ?? operation.end : operation.end);
  const depth = finiteNumber(operation.depth ?? operation.z);
  const positions = (Array.isArray(operation.crossPositions) ? operation.crossPositions : [])
    .map(finiteNumber)
    .filter(value => value !== null)
    .sort((left, right) => left - right);
  const frontOffset = positions[0];
  const backOffset = positions.length
    ? Math.max(0, dimensions.y - positions.at(-1))
    : null;
  const endOffset = end === null ? null : Math.max(0, dimensions.x - end);

  if ([start, end, endOffset, frontOffset, backOffset, depth].some(value => value === null) || end < start) {
    return null;
  }

  return [[
    centered ? "LR2M" : "LR2",
    `X=${formatNumber(start)}`,
    `Y=${formatNumber(frontOffset)}`,
    `Z=${formatNumber(depth)}`,
    `x=${formatNumber(endOffset)}`,
    `y=${formatNumber(backOffset)}`,
    ...(centered ? [] : ["C=0", "P=0"])
  ].join(" ")];
};

const translateHorizontalBore = (operation, dimensions) => {
  const positions = Array.isArray(operation.positions)
    ? operation.positions.map(finiteNumber).filter((value) => value !== null)
    : [];
  const z = finiteNumber(operation.depth ?? operation.z);
  const diameter = finiteNumber(operation.diameter);
  if (positions.length === 0 || z === null || diameter === null) return null;

  const sorted = [...positions].sort((left, right) => left - right);
  const spacing =
    sorted.length > 1
      ? (finiteNumber(operation.spacing) ?? sorted[1] - sorted[0])
      : (finiteNumber(operation.spacing) ?? 32);
  const endOffset = Math.max(0, dimensions.y - sorted.at(-1));
  const height = finiteNumber(operation.height) ?? dimensions.z / 2;

  return [
    [
      "VBH",
      `X=${formatNumber(height)}`,
      `Y=${formatNumber(sorted[0])}`,
      `y=${formatNumber(endOffset)}`,
      `Z=${formatNumber(z)}`,
      `R=${formatNumber(spacing)}`,
      `D=${formatNumber(diameter)}`
    ].join(" ")
  ];
};

const translateGroove = (operation, dimensions, configuration) => {
  const x = finiteNumber(operation.start?.x);
  const endX = finiteNumber(operation.end?.x);
  const y = transformY(operation.start?.y, dimensions, configuration);
  const z = finiteNumber(operation.start?.z ?? operation.depth);
  const width = finiteNumber(operation.width);
  const tool = configuredTool(operation, configuration, configuration.grooveTool).number;
  const correction = 3;
  if ([x, endX, y, z, width, tool, correction].some((value) => value === null))
    return null;

  return [
    [
      "RNT",
      `X=${formatNumber(x)}`,
      `Y=${formatNumber(y)}`,
      `Z=${formatNumber(z)}`,
      `x=${formatNumber(endX)}`,
      `B=${formatNumber(width)}`,
      `T=${formatNumber(tool)}`,
      `C=${formatNumber(correction)}`
    ].join(" ")
  ];
};

const point3 = (value, fallback = {}) => {
  const coordinate = (primary, secondary) => {
    const first = primary === null || primary === undefined || primary === ""
      ? null
      : finiteNumber(primary);
    if (first !== null) return first;
    return secondary === null || secondary === undefined || secondary === ""
      ? null
      : finiteNumber(secondary);
  };
  const x = coordinate(value?.x, fallback.x);
  const y = coordinate(value?.y, fallback.y);
  const z = coordinate(value?.z, fallback.z);
  return { x, y, z };
};

const pointsMatch = (left, right, tolerance = 0.001) => {
  const first = point3(left);
  const second = point3(right);
  return [first.x, first.y, first.z, second.x, second.y, second.z].every(value => value !== null) &&
    Math.abs(first.x - second.x) <= tolerance &&
    Math.abs(first.y - second.y) <= tolerance &&
    Math.abs(first.z - second.z) <= tolerance;
};

const lineIntersection = (first, second) => {
  const a = point3(first.start);
  const b = point3(first.target);
  const c = point3(second.start);
  const d = point3(second.target);
  if ([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y].some(value => value === null)) return null;
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const cdX = d.x - c.x;
  const cdY = d.y - c.y;
  const denominator = abX * cdY - abY * cdX;
  if (Math.abs(denominator) < 0.000001) return null;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const factor = (acX * cdY - acY * cdX) / denominator;
  return {
    x: a.x + factor * abX,
    y: a.y + factor * abY,
    z: b.z ?? c.z
  };
};

const normalizeNativeFillets = operations => {
  const normalized = operations.map(operation => ({
    ...operation,
    start: operation.start ? { ...operation.start } : operation.start,
    target: operation.target ? { ...operation.target } : operation.target
  }));

  for (let index = 0; index < normalized.length; index += 1) {
    const operation = normalized[index];
    if (operation.motion !== "arc") continue;
    const previous = normalized[index - 1];
    const next = normalized[index + 1];
    if (previous?.motion !== "linear" || next?.motion !== "linear") {
      return {
        error: "XGFIL benoetigt unmittelbar davor und danach jeweils eine Fraesgerade.",
        operation
      };
    }
    if (!pointsMatch(previous.target, operation.start) || !pointsMatch(operation.target, next.start)) {
      return {
        error: "Die Radiusgeometrie ist nicht tangential mit den angrenzenden Fraesgeraden verbunden.",
        operation
      };
    }
    const corner = lineIntersection(previous, next);
    if (!corner) {
      return {
        error: "Der gemeinsame Eckpunkt der Geraden fuer XGFIL konnte nicht bestimmt werden.",
        operation
      };
    }
    previous.target = { ...previous.target, ...corner };
    next.start = { ...next.start, ...corner };
  }

  return { operations: normalized };
};

const compensationCode = (compensation, configuration) => {
  if (compensation !== "left" && compensation !== "right") return 0;
  const mirrored = configuration.flipYAxis !== false;
  if (compensation === "left") return mirrored ? 1 : 2;
  return mirrored ? 2 : 1;
};

const machinePoint = (value, dimensions, configuration, fallback = {}) => {
  const source = point3(value, fallback);
  return {
    x: source.x,
    y: source.y === null ? null : transformY(source.y, dimensions, configuration),
    z: source.z
  };
};

const millingLine = (type, point, feed = null, tool = null) => {
  if ([point.x, point.y, point.z].some(value => value === null)) return null;
  const words = [type, `X=${formatNumber(point.x)}`, `Y=${formatNumber(point.y)}`, `Z=${formatNumber(point.z)}`];
  if (tool !== null) words.push(`T=${formatNumber(tool)}`);
  if (feed !== null && type !== "XG0") words.push(`V=${formatNumber(feed)}`);
  return words.join(" ");
};

const splitMillingPaths = operations => {
  const paths = [];
  let current = [];
  operations.forEach(operation => {
    if (operation.motion === "rapid" && current.length) {
      paths.push(current);
      current = [];
    }
    current.push(operation);
  });
  if (current.length) paths.push(current);
  return paths;
};

const translateMillingPath = (path, dimensions, configuration, programFace) => {
  const unsupportedFace = path.find(operation => !operationFaceSupported(operation, programFace));
  if (unsupportedFace) {
    return {
      error: `Der Fraespfad gehoert nicht zur ausgewaehlten Werkstueckseite ${programFace}.`,
      operation: unsupportedFace
    };
  }
  const rapid = path[0]?.motion === "rapid" ? path[0] : null;
  const cutting = rapid ? path.slice(1) : path;
  const normalizedResult = normalizeNativeFillets(cutting);
  if (normalizedResult.error) return normalizedResult;
  const normalized = normalizedResult.operations;
  const reference = normalized[0] ?? rapid;
  if (!reference) return { lines: [] };
  const machineTool = configuredTool(reference, configuration, configuration.millingTool);
  if (machineTool.number === null) {
    return { error: "Fuer den Fraespfad ist kein gueltiges Xilog-Werkzeug hinterlegt.", operation: reference };
  }
  const compensation = reference.compensation ?? rapid?.compensation ?? "center";
  const toolId = reference.toolId ?? rapid?.toolId ?? null;
  const incompatible = normalized.find(operation =>
    (operation.compensation ?? compensation) !== compensation ||
    (toolId !== null && operation.toolId !== undefined && operation.toolId !== toolId)
  );
  if (incompatible) {
    return {
      error: "Werkzeug oder Radiuskorrektur darf innerhalb eines Fraespfads nicht wechseln. Bitte einen neuen G0-Start einfuegen.",
      operation: incompatible
    };
  }

  const firstCut = normalized[0];
  const rawStart = rapid?.target ?? firstCut?.start;
  if (!rawStart) {
    return { error: "Dem Fraespfad fehlt ein Startpunkt fuer XG0.", operation: reference };
  }
  if (rapid && firstCut?.start && !pointsMatch(rapid.target, firstCut.start)) {
    return {
      error: "Der XG0-Startpunkt stimmt nicht mit dem Anfang der ersten Fraesgeraden ueberein.",
      operation: firstCut
    };
  }

  const start = machinePoint(rawStart, dimensions, configuration);
  const startLine = millingLine("XG0", start, null, machineTool.number);
  if (!startLine) return { error: "Der XG0-Startpunkt ist unvollstaendig.", operation: reference };
  const lines = [`C=${compensationCode(compensation, configuration)}`, startLine];
  let current = point3(rawStart);

  for (let index = 0; index < normalized.length; index += 1) {
    const operation = normalized[index];
    if (operation.motion === "arc") {
      const radius = finiteNumber(operation.radius);
      if (!(radius > 0)) return { error: "XGFIL benoetigt einen positiven Radius.", operation };
      lines.push(`XGFIL r=${formatNumber(radius)}`);
      continue;
    }
    if (operation.motion !== "linear") {
      return { error: `Unbekannte Fraesbewegung ${operation.motion ?? "ohne Kennung"}.`, operation };
    }
    const operationStart = point3(operation.start, current);
    if (!pointsMatch(current, operationStart)) {
      return {
        error: "Der Fraespfad ist unterbrochen. Vor einem neuen Pfad muss ein XG0-Start eingefuegt werden.",
        operation
      };
    }
    const target = point3(operation.target, current);
    const outputTarget = machinePoint(target, dimensions, configuration);
    const line = millingLine("XL2P", outputTarget, finiteNumber(operation.feed));
    if (!line) return { error: "Das Ziel der Fraesgeraden ist unvollstaendig.", operation };
    lines.push(line);
    current = target;
  }

  return { lines };
};

const translateMillingRun = (operations, dimensions, configuration, programFace) => {
  const lines = [];
  for (const path of splitMillingPaths(operations)) {
    const result = translateMillingPath(path, dimensions, configuration, programFace);
    if (result.error) return result;
    lines.push(...result.lines);
  }
  return { lines };
};

const translateOperation = (operation, dimensions, configuration, programFace) => {
  if (!operationFaceSupported(operation, programFace))
    return {
      error:
        `Die Bearbeitung gehoert nicht zur ausgewaehlten Werkstueckseite ${programFace}.`
    };

  switch (operation.kind) {
    case MACHINING_KINDS.DRILL_POINT:
    case MACHINING_KINDS.DRILL_PATTERN:
      return { lines: translateDrill(operation, dimensions, configuration) };
    case MACHINING_KINDS.DRILL_LINEAR_PATTERN:
      return {
        lines: isVerticalConnectorCycle(operation)
          ? translateVerticalConnector(operation, dimensions)
          : translateDrill(operation, dimensions, configuration)
      };
    case MACHINING_KINDS.DRILL_ROW:
      return { lines: translateShelfRow(operation, dimensions, configuration) };
    case MACHINING_KINDS.DRILL_EDGE_PATTERN:
      return {
        lines: translateHorizontalBore(operation, dimensions)
      };
    case MACHINING_KINDS.MILL_GROOVE:
      return { lines: translateGroove(operation, dimensions, configuration) };
    default:
      return {
        error: `Bearbeitungsart ${operation.kind || "ohne Kennung"} wird vom Xilog-3-Erstentwurf nicht unterstuetzt.`
      };
  }
};

export const xilog3Routolink = {
  manifest: {
    id: "scm-xilog3-routolink",
    name: "SCM Xilog 3 · RoutoLink",
    version: "0.5.0",
    apiVersion: POSTPROCESSOR_API_VERSION,
    description:
      "Erzeugt importierbare Xilog-3-XXL-Programme auf Basis der Wiest-Runtime und ihrer installierten Festzyklen.",
    vendor: "CarpentersProduction / Wiest",
    capabilities: {
      viewer: true,
      machineCode: true,
      machiningResolution: true
    },
    machineCodeFaces: ["A", "B"],
    machiningLocations: DEFAULT_MACHINING_LOCATIONS,
    sourceFormat: "Xilog 3 XXL (ASCII, CRLF)",
    supportedMachiningStrategies: [
      strategy(
        "connector.drill",
        "Bohrverbinder",
        [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN],
        "Native installierte VB1/VBH-Festzyklen sowie XBO-Einzel- und Rasterbohrungen."
      ),
      strategy(
        "connector.screw",
        "Spax",
        [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN],
        "Vertikale und horizontale Schraubbohrungen."
      ),
      strategy(
        "shelf.row",
        "Fachboden-Lochreihe",
        [MACHINING_KINDS.DRILL_ROW],
        "Native LR2-Lochreihe oder mittig verteilte LR2M-Lochreihe im 32-mm-Raster."
      ),
      strategy(
        "drawer.legrabox",
        "Legrabox",
        [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN],
        "Bohrgruppen aus dem internen Legrabox-Muster."
      ),
      strategy(
        "front.drawerMount",
        "Schubkastenfront",
        [MACHINING_KINDS.DRILL_POINT],
        "Befestigungsbohrungen an Schubkastenfronten."
      ),
      strategy(
        "front.hingeCup",
        "Topfbandbohrung",
        [MACHINING_KINDS.DRILL_POINT],
        "Topfbohrungen in Türfronten als XBO-Einzelbohrung."
      ),
      strategy(
        "front.hingeAuxiliary",
        "Topfband-Nebenbohrung",
        [MACHINING_KINDS.DRILL_POINT],
        "Nebenbohrungen an Topfbandfronten."
      ),
      strategy(
        "cabinet.hingePlate",
        "Topfband-Montageplatte",
        [MACHINING_KINDS.DRILL_POINT],
        "Montageplattenbohrungen in der Korpusseite."
      ),
      strategy(
        "back.groove",
        "Rueckwandnut",
        [MACHINING_KINDS.MILL_GROOVE],
        "Installierter Wiest-Festzyklus RNT mit Nutbreite und Werkzeug 81."
      ),
      strategy(
        "back.rabbet",
        "Rueckwandfalz",
        [MACHINING_KINDS.MILL_PATH],
        "Zusammenhaengende Fraespfade mit XG0, XL2P und nativen XGFIL-Radien."
      ),
      strategy(
        "manual.drilling",
        "Manuelles Bohren",
        [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN, MACHINING_KINDS.DRILL_ROW],
        "Manuell programmierte Bohrungen und Bohrmuster."
      ),
      strategy(
        "manual.groove",
        "Manuelle Nut",
        [MACHINING_KINDS.MILL_GROOVE],
        "Manuell programmierte Nut als RNT-Zyklus."
      ),
      strategy(
        "manual.milling",
        "Manuelles Fraesen",
        [MACHINING_KINDS.MILL_PATH],
        "G0, Geraden, native Werkzeugkorrektur C=0/C=1/C=2 und XGFIL-Radien."
      )
    ],
    configuration: [
      {
        key: "machineName",
        label: "Maschinenname",
        type: "text",
        defaultValue: "SCM RoutoLink",
        required: true
      },
      {
        key: "workingFields",
        label: "Standard-Anschlag für neue Bauteile",
        type: "select",
        options: DEFAULT_MACHINING_LOCATIONS.map(location => ({ value: location.id, label: `${location.label} · ${location.anchorCorner === "top-right" ? "oben rechts" : "oben links"}` })),
        defaultValue: "AD",
        required: true
      },
      {
        key: "departurePositionA",
        label: "Wegfahrposition Feld A",
        type: "number",
        min: 0,
        unit: "mm",
        defaultValue: 1600
      },
      {
        key: "departurePositionAD",
        label: "Wegfahrposition Feld AD",
        type: "number",
        min: 0,
        unit: "mm",
        defaultValue: 2800
      },
      {
        key: "toolSetup",
        label: "Ruestdatei",
        type: "text",
        defaultValue: "W",
        required: true
      },
      {
        key: "flipYAxis",
        label: "Y-Achse fuer Xilog spiegeln",
        type: "boolean",
        defaultValue: true
      },
      {
        key: "programRepetitions",
        label: "Header-Wiederholungen",
        type: "number",
        min: 1,
        defaultValue: 99
      },
      {
        key: "grooveTool",
        label: "Werkzeug Rueckwandnut",
        type: "number",
        min: 1,
        defaultValue: 81
      },
      {
        key: "millingTool",
        label: "Standard-Fraeswerkzeug",
        type: "number",
        min: 1,
        defaultValue: 114
      },
      {
        key: "toolDatabase",
        label: "Werkzeugdatenbank",
        type: "toolDatabase",
        defaultValue: [
          { id: "drill-5", name: "Bohrer 5 mm", category: "drilling", diameter: 5, toolNumber: 5 },
          { id: "router-8", name: "Schaftfraeser 8 mm", category: "milling", diameter: 8, toolNumber: 114 },
          { id: "groove-8", name: "Nutwerkzeug 8,3 mm", category: "milling", diameter: 8.3, toolNumber: 81 }
        ]
      }
    ]
  },

  translateForViewer({ part }) {
    return translateNeutralPartForViewer(part);
  },

  resolveProgramHeader({ part, postprocessor }) {
    return resolveProgramHeader({
      manifest: this.manifest,
      part,
      defaultStopId: workingFields(postprocessor?.configuration?.workingFields)
    });
  },

  generateMachineCode({ part, fileName, face = "A", postprocessor, resolvedMachining = {} }) {
    const configuration = postprocessor?.configuration ?? {};
    const dimensions = partDimensions(part);
    const diagnostics = [];
    const programFace = String(face || "A").toUpperCase();
    if (!["A", "B"].includes(programFace)) {
      return {
        supported: false,
        code: null,
        diagnostics: [diagnostic("error", "UNSUPPORTED_PROGRAM_FACE", `Werkstueckseite ${programFace} wird von Xilog 3 nicht unterstuetzt.`)]
      };
    }
    try {
      assertNeutralPartCnc(part);
    } catch (error) {
      return {
        supported: false,
        code: null,
        diagnostics: [diagnostic("error", "INVALID_NEUTRAL_CNC_SCHEMA", error.message)]
      };
    }
    if (
      [dimensions.x, dimensions.y, dimensions.z].some(
        (value) => value === null || value <= 0
      )
    ) {
      return {
        supported: false,
        code: null,
        diagnostics: [
          diagnostic(
            "error",
            "INVALID_PART_DIMENSIONS",
            "Das Bauteil benoetigt positive Werte fuer L, B und T."
          )
        ]
      };
    }

    const operations = (Array.isArray(part?.CNC?.operations)
      ? part.CNC.operations
      : []).filter(operation => operationFaceSupported(operation, programFace));
    const header = this.resolveProgramHeader({ part, postprocessor });
    const fields = workingFields(header.outputCode);
    const departure = departureStep(configuration, fields);
    const lines = [
      [
        "H",
        `DX=${formatNumber(dimensions.x)}`,
        `DY=${formatNumber(dimensions.y)}`,
        `DZ=${formatNumber(dimensions.z)}`,
        `-${fields}`,
        "C=0",
        "T=0",
        `R=${Math.max(1, Math.floor(finiteNumber(configuration.programRepetitions) ?? 99))}`,
        "*MM",
        `/"${setupName(configuration.toolSetup)}"`,
        `;Generated by CarpentersProduction - validate in Xilog 3${programFace === "B" ? " - face B" : ""}${header.comment ? ` - ${header.comment.replace(/[;\r\n]/g, " ").slice(0, 120)}` : ""}`
      ].join(" ")
    ];
    if (header.sx) lines.push("SX=1");
    if (header.sy) lines.push("SY=1");
    let activeMachiningFace = 1;
    const activateMachiningFace = face => {
      if (face === activeMachiningFace) return;
      lines.push(`F=${face}`);
      activeMachiningFace = face;
    };
    const validateOperation = operation => {
      const assignment = resolvedMachining[operation.intentId]?.assignment;
      const strategy = this.manifest.supportedMachiningStrategies.find(
        item => item.id === assignment?.strategyId
      );
      if (!strategy || !strategy.operationKinds.includes(operation.kind)) {
        diagnostics.push(diagnostic(
          "error",
          "UNSUPPORTED_MACHINING_ENDPOINT",
          `Der Endpunkt ${operation.intentId ?? "ohne Kennung"} ist keiner passenden Xilog-Strategie zugeordnet.`,
          operation
        ));
        return false;
      }
      return true;
    };

    for (let index = 0; index < operations.length;) {
      const operation = operations[index];
      if (!validateOperation(operation)) {
        index += 1;
        continue;
      }

      if (operation.kind === MACHINING_KINDS.MILL_PATH) {
        const millingOperations = [];
        let end = index;
        while (end < operations.length && operations[end].kind === MACHINING_KINDS.MILL_PATH) {
          if (validateOperation(operations[end])) millingOperations.push(operations[end]);
          end += 1;
        }
        const result = translateMillingRun(millingOperations, dimensions, configuration, programFace);
        if (result.error || !result.lines) {
          const failedOperation = result.operation ?? operation;
          diagnostics.push(diagnostic(
            "error",
            result.error ? "UNSUPPORTED_XILOG_MILLING_PATH" : "INVALID_XILOG_OPERATION",
            result.error ?? "Der Fraespfad enthaelt unvollstaendige oder ungueltige Geometriedaten.",
            failedOperation
          ));
        } else {
          activateMachiningFace(1);
          lines.push(...result.lines);
        }
        index = end;
        continue;
      }

      const result = translateOperation(
        operation,
        dimensions,
        configuration,
        programFace
      );
      if (result.error || !result.lines) {
        diagnostics.push(
          diagnostic(
            "error",
            result.error
              ? "UNSUPPORTED_XILOG_OPERATION"
              : "INVALID_XILOG_OPERATION",
            result.error ??
              `Bearbeitung ${operation.kind} enthaelt unvollstaendige oder ungueltige Geometriedaten.`,
            operation
          )
        );
        index += 1;
        continue;
      }
      activateMachiningFace(
        operation.kind === MACHINING_KINDS.DRILL_EDGE_PATTERN
          ? (operation.edge === "right" ? 2 : 3)
          : 1
      );
      lines.push(...result.lines);
      index += 1;
    }

    if (diagnostics.some((entry) => entry.level === "error")) {
      return { supported: false, code: null, diagnostics };
    }

    activateMachiningFace(1);
    lines.push(`N X=${formatNumber(departure.position)}`);

    diagnostics.push(
      diagnostic(
        "warning",
        "XILOG3_IMPORT_VALIDATION_REQUIRED",
        "Erstentwurf: XXL zuerst in Xilog 3 importieren, grafisch pruefen und nur nach Maschinenfreigabe als PGM ausfuehren."
      )
    );
    const name = faceProgramName(fileName ?? part?.PID ?? part?.Objektname, programFace);
    return {
      supported: true,
      code: `${lines.join("\r\n")}\r\n`,
      fileName: `${name}.xxl`,
      format: "xilog3-xxl",
      mimeType: "text/plain",
      encoding: "windows-1252",
      diagnostics,
      metadata: {
        operationCount: operations.length,
        programFace,
        dimensions,
        toolSetup: setupName(configuration.toolSetup),
        workingFields: fields,
        header,
        departure
      }
    };
  },

  resolveMachining({ intent, assignments = {} }) {
    const assignment = assignments[intent];
    const supported = this.manifest.supportedMachiningStrategies.some(
      (item) => item.id === assignment?.strategyId
    );
    return {
      intent,
      supported,
      assignment: supported ? assignment : null,
      diagnostics: supported
        ? []
        : [
            diagnostic(
              "error",
              "UNSUPPORTED_MACHINING_STRATEGY",
              `Die Bearbeitung ${assignment?.strategyId ?? intent} wird vom Xilog-3-Postprozessor nicht unterstuetzt.`
            )
          ]
    };
  }
};
