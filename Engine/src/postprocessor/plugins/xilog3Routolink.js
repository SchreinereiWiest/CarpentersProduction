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
  const rows = operation.crossPositions
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
  const tool = finiteNumber(configuration.grooveTool);
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
  const type = operation.motion === "rapid" ? "XG0" : "XL2P";
  const targetX = finiteNumber(operation.target?.x ?? state.x);
  const sourceY = finiteNumber(operation.target?.y);
  const targetY =
    sourceY === null ? state.y : transformY(sourceY, dimensions, configuration);
  const targetZ = finiteNumber(operation.target?.z ?? state.z);
  if ([targetX, targetY, targetZ].some((value) => value === null)) return null;

  state.x = targetX;
  state.y = targetY;
  state.z = targetZ;

  const words = [
    type,
    `X=${formatNumber(targetX)}`,
    `Y=${formatNumber(targetY)}`,
    `Z=${formatNumber(targetZ)}`
  ];
  if (type === "XG0") {
    const tool = finiteNumber(
      configuration.millingTool
    );
    if (tool === null) return null;
    words.push(`T=${formatNumber(tool)}`);
  }
  const feed = finiteNumber(operation.feed ?? operation.V);
  if (feed !== null) words.push(`V=${formatNumber(feed)}`);
  return [words.join(" ")];
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
