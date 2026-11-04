import { POSTPROCESSOR_API_VERSION } from "../contract.js";
import {
  MACHINING_KINDS,
  assertNeutralPartCnc,
  translateNeutralPartForViewer
} from "../machiningModel.js";

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

const compensatedLine = (operation, toolDiameter) => {
  const start = operation.start;
  const target = operation.target;
  const compensation = operation.compensation ?? "center";
  if (!start || !target || compensation === "center" || !(toolDiameter > 0)) {
    return { start, target };
  }
  const startX = finiteNumber(start.x);
  const startY = finiteNumber(start.y);
  const targetX = finiteNumber(target.x);
  const targetY = finiteNumber(target.y);
  if ([startX, startY, targetX, targetY].some(value => value === null)) {
    return { start, target };
  }
  const dx = targetX - startX;
  const dy = targetY - startY;
  const length = Math.hypot(dx, dy);
  if (!(length > 0)) return { start, target };
  const direction = compensation === "left" ? 1 : -1;
  const offset = toolDiameter / 2;
  // Das neutrale Koordinatensystem hat eine nach unten laufende Y-Achse.
  const ox = direction * (dy / length) * offset;
  const oy = direction * (-dx / length) * offset;
  return {
    start: { ...start, x: startX + ox, y: startY + oy },
    target: { ...target, x: targetX + ox, y: targetY + oy }
  };
};

const arcPoints = (operation, toolDiameter, configuration) => {
  const start = operation.start;
  const target = operation.target;
  const center = operation.center;
  if (!start || !target || !center) return null;
  const centerX = finiteNumber(center.x);
  const centerY = finiteNumber(center.y);
  const startX = finiteNumber(start.x);
  const startY = finiteNumber(start.y);
  const targetX = finiteNumber(target.x);
  const targetY = finiteNumber(target.y);
  if ([centerX, centerY, startX, startY, targetX, targetY].some(value => value === null)) return null;

  const programmedRadius = finiteNumber(operation.radius) ?? Math.hypot(startX - centerX, startY - centerY);
  const clockwise = operation.direction !== "counterclockwise";
  const compensation = operation.compensation ?? "center";
  const radiusOffset = compensation === "center" || !(toolDiameter > 0)
    ? 0
    : toolDiameter / 2 * (
      compensation === "left"
        ? (clockwise ? 1 : -1)
        : (clockwise ? -1 : 1)
    );
  const radius = programmedRadius + radiusOffset;
  if (!(radius > 0)) return null;

  const startAngle = Math.atan2(startY - centerY, startX - centerX);
  const targetAngle = Math.atan2(targetY - centerY, targetX - centerX);
  let sweep = targetAngle - startAngle;
  if (clockwise) {
    while (sweep <= 0) sweep += Math.PI * 2;
  } else {
    while (sweep >= 0) sweep -= Math.PI * 2;
  }
  const segmentLength = Math.max(0.5, finiteNumber(configuration.arcSegmentLength) ?? 5);
  const count = Math.max(2, Math.ceil(Math.abs(sweep) * radius / segmentLength));
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = startAngle + sweep * index / count;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      z: finiteNumber(target.z ?? start.z)
    };
  });
};

const operationFaceSupported = (operation) =>
  String(operation?.face || "A").toUpperCase() === "A";

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
  if (repetitions > 1) {
    words.push(`R=${repetitions}`);
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

const translateShelfRow = (operation, dimensions, configuration) => {
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

const translateHorizontalBore = (operation, dimensions, configuration) => {
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
  const face = operation.edge === "right" ? 2 : 3;
  const height = finiteNumber(operation.height) ?? dimensions.z / 2;

  return [
    `F=${face}`,
    [
      "VBH",
      `X=${formatNumber(height)}`,
      `Y=${formatNumber(sorted[0])}`,
      `y=${formatNumber(endOffset)}`,
      `Z=${formatNumber(z)}`,
      `R=${formatNumber(spacing)}`,
      `D=${formatNumber(diameter)}`
    ].join(" "),
    "F=1"
  ];
};

const translateGroove = (operation, dimensions, configuration) => {
  const x = finiteNumber(operation.start?.x);
  const endX = finiteNumber(operation.end?.x);
  const y = transformY(operation.start?.y, dimensions, configuration);
  const z = finiteNumber(operation.start?.z ?? operation.depth);
  const width = finiteNumber(operation.width);
  const tool = configuredTool(operation, configuration, configuration.grooveTool).number;
  const correction = finiteNumber(configuration.grooveCorrection ?? 0);
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

const translateMilling = (operation, dimensions, configuration, state) => {
  const machineTool = configuredTool(operation, configuration, configuration.millingTool);
  if (machineTool.number === null) return null;
  const feed = finiteNumber(operation.feed);
  const line = (type, point, includeTool = false) => {
    const pointX = finiteNumber(point?.x);
    const pointY = finiteNumber(point?.y);
    const pointZ = finiteNumber(point?.z);
    const x = pointX ?? state.x;
    const y = pointY === null ? state.y : transformY(pointY, dimensions, configuration);
    const z = pointZ ?? state.z;
    if ([x, y, z].some(value => value === null)) return null;
    const words = [type, `X=${formatNumber(x)}`, `Y=${formatNumber(y)}`, `Z=${formatNumber(z)}`];
    if (includeTool) words.push(`T=${formatNumber(machineTool.number)}`);
    if (feed !== null && type !== "XG0") words.push(`V=${formatNumber(feed)}`);
    state.x = x;
    state.y = y;
    state.z = z;
    return words.join(" ");
  };

  if (operation.motion === "rapid") {
    const rapid = line("XG0", operation.target, true);
    return rapid ? [rapid] : null;
  }

  if (operation.motion === "arc") {
    const points = arcPoints(operation, machineTool.diameter, configuration);
    if (!points?.length) return null;
    const start = line("XG0", points[0], true);
    const segments = points.slice(1).map(point => line("XL2P", point)).filter(Boolean);
    return start && segments.length === points.length - 1 ? [start, ...segments] : null;
  }

  const compensated = compensatedLine(operation, machineTool.diameter);
  const lines = [];
  const programmedStart = compensated.start ?? operation.start;
  const startX = finiteNumber(programmedStart?.x);
  const startY = transformY(programmedStart?.y, dimensions, configuration);
  const startZ = finiteNumber(programmedStart?.z);
  const startDiffersFromMachine = programmedStart && (
    state.x === null || state.y === null || state.z === null ||
    [startX, startY, startZ].some(value => value === null) ||
    Math.abs(state.x - startX) > 0.0001 ||
    Math.abs(state.y - startY) > 0.0001 ||
    Math.abs(state.z - startZ) > 0.0001
  );
  if (startDiffersFromMachine) {
    const start = line("XG0", compensated.start, true);
    if (!start) return null;
    lines.push(start);
  }
  const target = line("XL2P", compensated.target ?? operation.target);
  if (!target) return null;
  lines.push(target);
  return lines;
};

const translateOperation = (operation, dimensions, configuration, state) => {
  if (!operationFaceSupported(operation))
    return {
      error:
        "Nur Bearbeitungen auf Werkstueckseite A sind im Erstentwurf freigegeben."
    };

  switch (operation.kind) {
    case MACHINING_KINDS.DRILL_POINT:
    case MACHINING_KINDS.DRILL_PATTERN:
    case MACHINING_KINDS.DRILL_LINEAR_PATTERN:
      return { lines: translateDrill(operation, dimensions, configuration) };
    case MACHINING_KINDS.DRILL_ROW:
      return { lines: translateShelfRow(operation, dimensions, configuration) };
    case MACHINING_KINDS.DRILL_EDGE_PATTERN:
      return {
        lines: translateHorizontalBore(operation, dimensions, configuration)
      };
    case MACHINING_KINDS.MILL_GROOVE:
      return { lines: translateGroove(operation, dimensions, configuration) };
    case MACHINING_KINDS.MILL_PATH:
      return {
        lines: translateMilling(operation, dimensions, configuration, state)
      };
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
    version: "0.3.0",
    apiVersion: POSTPROCESSOR_API_VERSION,
    description:
      "Erzeugt importierbare Xilog-3-XXL-Programme auf Basis der Wiest-Runtime und ihrer installierten Festzyklen.",
    vendor: "CarpentersProduction / Wiest",
    capabilities: {
      viewer: true,
      machineCode: true,
      machiningResolution: true
    },
    sourceFormat: "Xilog 3 XXL (ASCII, CRLF)",
    supportedMachiningStrategies: [
      strategy(
        "connector.drill",
        "Bohrverbinder",
        [MACHINING_KINDS.DRILL_POINT, MACHINING_KINDS.DRILL_PATTERN, MACHINING_KINDS.DRILL_LINEAR_PATTERN, MACHINING_KINDS.DRILL_EDGE_PATTERN],
        "Optimierte XBO-Bohrungen und der installierte VBH-Festzyklus."
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
        "Eine oder zwei optimierte XBO-Lochreihen."
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
        "Fraesstart und lineare Fraesbewegungen mit XG0/XL2P."
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
        "G0, Geraden und linearisierte Radiusbahnen."
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
        label: "Arbeitsfelder im Header",
        type: "text",
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
        key: "grooveCorrection",
        label: "Korrektur Rueckwandnut",
        type: "number",
        min: 0,
        defaultValue: 3
      },
      {
        key: "millingTool",
        label: "Standard-Fraeswerkzeug",
        type: "number",
        min: 1,
        defaultValue: 114
      },
      {
        key: "arcSegmentLength",
        label: "Segmentlaenge Radiusbahn",
        type: "number",
        min: 0.5,
        unit: "mm",
        defaultValue: 5
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

  generateMachineCode({ part, fileName, postprocessor, resolvedMachining = {} }) {
    const configuration = postprocessor?.configuration ?? {};
    const dimensions = partDimensions(part);
    const diagnostics = [];
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

    const operations = Array.isArray(part?.CNC?.operations)
      ? part.CNC.operations
      : [];
    const fields = workingFields(configuration.workingFields);
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
        ";Generated by CarpentersProduction - validate in Xilog 3"
      ].join(" ")
    ];
    const state = { x: null, y: null, z: null };

    operations.forEach((operation) => {
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
        return;
      }
      const result = translateOperation(
        operation,
        dimensions,
        configuration,
        state
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
        return;
      }
      lines.push(...result.lines);
    });

    if (diagnostics.some((entry) => entry.level === "error")) {
      return { supported: false, code: null, diagnostics };
    }

    lines.push(`N=${formatNumber(departure.position)}`);

    diagnostics.push(
      diagnostic(
        "warning",
        "XILOG3_IMPORT_VALIDATION_REQUIRED",
        "Erstentwurf: XXL zuerst in Xilog 3 importieren, grafisch pruefen und nur nach Maschinenfreigabe als PGM ausfuehren."
      )
    );
    const name = programName(fileName ?? part?.PID ?? part?.Objektname);
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
        dimensions,
        toolSetup: setupName(configuration.toolSetup),
        workingFields: fields,
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
