export const ETICKET_SCHEMA_VERSION = 1;

export const DEFAULT_ETICKET_SETTINGS = Object.freeze({
  enabled: true,
  printer: {
    language: "zpl",
    host: "",
    port: 9100,
    dpi: 203,
    timeoutMs: 5000
  },
  label: {
    widthMm: 100,
    heightMm: 50,
    gapMm: 2,
    copies: 1,
    darkness: 15
  },
  code: {
    type: "qr",
    position: "right",
    sizeMm: 24,
    humanReadable: true
  },
  preprint: {
    enabled: true,
    title: "BAUTEIL",
    footer: "Carpenters Production",
    showBorder: true
  },
  information: {
    pid: true,
    project: true,
    customer: true,
    partName: true,
    cabinet: true,
    dimensions: true,
    material: true,
    edges: true,
    cncProgram: true,
    instance: false
  },
  fieldOrder: [
    "pid",
    "partName",
    "dimensions",
    "material",
    "edges",
    "project",
    "customer",
    "cabinet",
    "cncProgram",
    "instance"
  ]
});

const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const boundedNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const text = (value, fallback = "", max = 120) => String(value ?? fallback).trim().slice(0, max);

export function normalizeEticketSettings(value = {}) {
  const input = object(value);
  const printer = object(input.printer);
  const label = object(input.label);
  const code = object(input.code);
  const preprint = object(input.preprint);
  const information = object(input.information);
  const defaults = DEFAULT_ETICKET_SETTINGS;
  const order = Array.isArray(input.fieldOrder)
    ? input.fieldOrder.filter(field => defaults.fieldOrder.includes(field))
    : defaults.fieldOrder;

  return {
    enabled: input.enabled !== false,
    printer: {
      language: ["zpl", "tspl"].includes(printer.language) ? printer.language : defaults.printer.language,
      host: text(printer.host, defaults.printer.host, 253),
      port: Math.round(boundedNumber(printer.port, defaults.printer.port, 1, 65535)),
      dpi: [203, 300, 600].includes(Number(printer.dpi)) ? Number(printer.dpi) : defaults.printer.dpi,
      timeoutMs: Math.round(boundedNumber(printer.timeoutMs, defaults.printer.timeoutMs, 500, 30000))
    },
    label: {
      widthMm: boundedNumber(label.widthMm, defaults.label.widthMm, 20, 300),
      heightMm: boundedNumber(label.heightMm, defaults.label.heightMm, 15, 300),
      gapMm: boundedNumber(label.gapMm, defaults.label.gapMm, 0, 30),
      copies: Math.round(boundedNumber(label.copies, defaults.label.copies, 1, 20)),
      darkness: Math.round(boundedNumber(label.darkness, defaults.label.darkness, 0, 30))
    },
    code: {
      type: ["qr", "code128"].includes(code.type) ? code.type : defaults.code.type,
      position: ["left", "right", "top", "bottom"].includes(code.position) ? code.position : defaults.code.position,
      sizeMm: boundedNumber(code.sizeMm, defaults.code.sizeMm, 10, 80),
      humanReadable: code.humanReadable !== false
    },
    preprint: {
      enabled: preprint.enabled !== false,
      title: text(preprint.title, defaults.preprint.title, 40),
      footer: text(preprint.footer, defaults.preprint.footer, 60),
      showBorder: preprint.showBorder !== false
    },
    information: Object.fromEntries(
      Object.keys(defaults.information).map(key => [key, information[key] === undefined ? defaults.information[key] : Boolean(information[key])])
    ),
    fieldOrder: [...new Set([...order, ...defaults.fieldOrder])]
  };
}
