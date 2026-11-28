import { normalizeEticketSettings } from "./defaults.js";
import { getEticketInformationRows, normalizeEticketData } from "./payload.js";

const mmToDots = (mm, dpi) => Math.round(Number(mm) * Number(dpi) / 25.4);
const ascii = value => String(value ?? "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[\^~\r\n]/g, " ")
  .trim();
const tspl = value => ascii(value).replace(/["\\]/g, " ");

function layout(settings) {
  const width = mmToDots(settings.label.widthMm, settings.printer.dpi);
  const height = mmToDots(settings.label.heightMm, settings.printer.dpi);
  const padding = Math.max(12, mmToDots(3, settings.printer.dpi));
  const codeSize = Math.min(mmToDots(settings.code.sizeMm, settings.printer.dpi), Math.min(width, height) - padding * 2);
  const position = settings.code.position;
  const horizontal = position === "left" || position === "right";
  const codeX = position === "right" ? width - padding - codeSize : padding;
  const codeY = position === "bottom" ? height - padding - codeSize : padding;
  const textX = position === "left" ? padding + codeSize + padding : padding;
  const textY = position === "top" ? padding + codeSize + padding : padding;
  const textWidth = horizontal ? width - codeSize - padding * 3 : width - padding * 2;
  const textHeight = horizontal ? height - padding * 2 : height - codeSize - padding * 3;
  return { width, height, padding, codeSize, codeX, codeY, textX, textY, textWidth, textHeight };
}

function zplJob(data, settings) {
  const box = layout(settings);
  const rows = getEticketInformationRows(data, settings);
  const titleHeight = settings.preprint.enabled && settings.preprint.title ? Math.max(22, Math.round(settings.printer.dpi * 0.15)) : 0;
  const footerHeight = settings.preprint.enabled && settings.preprint.footer ? Math.max(18, Math.round(settings.printer.dpi * 0.11)) : 0;
  const rowHeight = Math.max(20, Math.floor((box.textHeight - titleHeight - footerHeight) / Math.max(1, rows.length)));
  const fontSize = Math.min(Math.max(18, Math.round(rowHeight * 0.62)), Math.round(settings.printer.dpi * 0.16));
  const codeModule = Math.max(2, Math.floor(box.codeSize / (settings.code.type === "qr" ? 35 : 70)));
  const commands = [
    "^XA",
    "^CI28",
    `^PW${box.width}`,
    `^LL${box.height}`,
    `^MD${settings.label.darkness}`
  ];
  if (settings.preprint.showBorder) commands.push(`^FO2,2^GB${box.width - 4},${box.height - 4},2^FS`);
  if (titleHeight) commands.push(`^FO${box.textX},${box.textY}^A0N,${titleHeight},${titleHeight}^FD${ascii(settings.preprint.title)}^FS`);
  rows.forEach((row, index) => {
    const y = box.textY + titleHeight + index * rowHeight;
    commands.push(`^FO${box.textX},${y}^A0N,${fontSize},${fontSize}^FB${box.textWidth},1,0,L,0^FD${ascii(`${row.label}: ${row.value}`)}^FS`);
  });
  if (settings.preprint.enabled && settings.preprint.footer) {
    commands.push(`^FO${box.textX},${box.textY + box.textHeight - footerHeight}^A0N,${footerHeight},${footerHeight}^FD${ascii(settings.preprint.footer)}^FS`);
  }
  if (settings.code.type === "code128") {
    const height = Math.max(40, Math.round(box.codeSize * 0.58));
    commands.push(`^FO${box.codeX},${box.codeY}^BY${codeModule},2,${height}^BCN,${height},${settings.code.humanReadable ? "Y" : "N"},N,N^FD${ascii(data.code)}^FS`);
  } else {
    commands.push(`^FO${box.codeX},${box.codeY}^BQN,2,${codeModule}^FDLA,${ascii(data.code)}^FS`);
  }
  commands.push(`^PQ${settings.label.copies},0,1,N`, "^XZ");
  return commands.join("\n");
}

function tsplJob(data, settings) {
  const box = layout(settings);
  const rows = getEticketInformationRows(data, settings);
  const fontScale = settings.printer.dpi >= 300 ? 12 : 10;
  const rowHeight = Math.max(22, Math.floor(box.textHeight / Math.max(2, rows.length + 1)));
  const commands = [
    `SIZE ${settings.label.widthMm} mm,${settings.label.heightMm} mm`,
    `GAP ${settings.label.gapMm} mm,0 mm`,
    "DIRECTION 1",
    "CLS"
  ];
  if (settings.preprint.showBorder) commands.push(`BOX 2,2,${box.width - 2},${box.height - 2},2`);
  let rowY = box.textY;
  if (settings.preprint.enabled && settings.preprint.title) {
    commands.push(`TEXT ${box.textX},${rowY},"0",0,${fontScale + 2},${fontScale + 2},"${tspl(settings.preprint.title)}"`);
    rowY += rowHeight;
  }
  rows.forEach(row => {
    commands.push(`TEXT ${box.textX},${rowY},"0",0,${fontScale},${fontScale},"${tspl(`${row.label}: ${row.value}`)}"`);
    rowY += rowHeight;
  });
  if (settings.code.type === "code128") {
    commands.push(`BARCODE ${box.codeX},${box.codeY},"128",${Math.max(40, Math.round(box.codeSize * 0.55))},${settings.code.humanReadable ? 1 : 0},0,2,2,"${tspl(data.code)}"`);
  } else {
    commands.push(`QRCODE ${box.codeX},${box.codeY},M,${Math.max(3, Math.floor(box.codeSize / 35))},A,0,M2,S7,"${tspl(data.code)}"`);
  }
  if (settings.preprint.enabled && settings.preprint.footer) {
    commands.push(`TEXT ${box.textX},${box.textY + box.textHeight - rowHeight},"0",0,8,8,"${tspl(settings.preprint.footer)}"`);
  }
  commands.push(`PRINT ${settings.label.copies},1`);
  return commands.join("\r\n");
}

export function createEticketPrintJob(ticketData, configuredSettings) {
  const settings = normalizeEticketSettings(configuredSettings);
  const data = normalizeEticketData(ticketData);
  const content = settings.printer.language === "tspl"
    ? tsplJob(data, settings)
    : zplJob(data, settings);
  return {
    content,
    encoding: "utf8",
    language: settings.printer.language,
    copies: settings.label.copies,
    data,
    settings
  };
}
