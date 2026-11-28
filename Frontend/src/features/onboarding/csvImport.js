const countDelimiter = (line, delimiter) => {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    if (!quoted && line[index] === delimiter) count += 1;
  }
  return count;
};

export function parseDelimitedText(input) {
  const text = String(input || "").replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = countDelimiter(firstLine, ";") >= countDelimiter(firstLine, ",") ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(value => value !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("Die Datei enthält keine Datenzeilen.");

  const headers = rows[0].map((value, index) => value || `Spalte ${index + 1}`);
  return {
    delimiter,
    headers,
    rows: rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])))
  };
}

const normalized = value => String(value || "")
  .toLocaleLowerCase("de-DE")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]/g, "");

export function inferColumn(headers, aliases) {
  const choices = aliases.map(normalized);
  return headers.find(header => choices.includes(normalized(header))) || "";
}

export const mappedValue = (row, mapping, key) => mapping[key] ? row[mapping[key]] || "" : "";
