import { IMPORT_BALANCE_FIELDS, IMPORT_ASSET_CATEGORIES, IMPORT_LIMITS } from '../defaults/import.defaults.mjs';
import { ASSET_DEFAULTS, LOAN_DEFAULTS, createAnnualCostDefaults, createAssetDefaults, createLoanDefaults } from '../defaults/forms.defaults.mjs';
import { DATE_PATTERN, IDENTIFIER_PATTERN } from '../defaults/validation.defaults.mjs';
import { ANNUAL_COST_CATALOG } from '../defaults/catalog.defaults.mjs';

/** Liest CSV mit Semikolon oder Komma, zitierten Zellen und Zeilenumbrüchen; fehlerhafte Zitierung wird abgelehnt. */
function parseCsv(source) {
  const text = source.replace(/^\uFEFF/, "");
  const delimiter = text
    .slice(0, text.indexOf("\n") < 0 ? undefined : text.indexOf("\n"))
    .includes(";")
    ? ";"
    : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted)
    throw new Error("CSV enthält ein nicht geschlossenes Anführungszeichen.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Normalisiert Importbezeichnungen für einen von Großschreibung unabhängigen Positionsabgleich. */
const normalized = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("de");

/** Liest deutsche oder einfache Dezimalbeträge; leere optionale Zellen verwenden den übergebenen Vorgabewert. */
export function importNumber(value, fallback = 0) {
  if (value === "" || value === undefined) return fallback;
  let text = String(value).replace(/[€\s]/g, "");
  if (text.includes(",")) text = text.replaceAll(".", "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replaceAll(".", "");
  if (!/^-?\d+(\.\d+)?$/.test(text) || !Number.isFinite(Number(text)))
    throw new Error(`Ungültiger Betrag: ${value}`);
  return Number(text);
}

/** Prüft die gesamte Importdatei und erstellt eine Vorschaukopie; Kennung oder Name aktualisieren vorhandene Positionen ohne doppelte Übernahme. */
export function importManagementCsv(source, current, idFactory) {
  if (source.length > IMPORT_LIMITS.bytes)
    throw new Error("Importdatei darf maximal 2 MB groß sein.");
  const rows = parseCsv(source);
  const headers = rows.shift()?.map(normalized) || [];
  if (
    !headers.includes("bereich") ||
    !headers.includes("position") ||
    !headers.includes("wert")
  )
    throw new Error("CSV benötigt die Spalten bereich, position und wert.");
  if (!rows.length || rows.length > IMPORT_LIMITS.rows)
    throw new Error("CSV muss 1 bis 1.500 Datenzeilen enthalten.");
  const config = structuredClone(current);
  const counts = { assets: 0, loans: 0, annualCosts: 0, balances: 0 };
  const used = new Set();
  rows.forEach((cells, index) => {
    try {
      if (cells.length !== headers.length)
        throw new Error(
          "Spaltenanzahl stimmt nicht mit der Kopfzeile überein."
        );
      const record = Object.fromEntries(
        headers.map((header, i) => [header, cells[i]])
      );
      const name = record.position;
      if (!name) throw new Error("Position fehlt.");
      const section = normalized(record.bereich);
      const importKey = `${section}:${normalized(record.kennung || name)}`;
      if (used.has(importKey))
        throw new Error("Position ist in dieser Datei doppelt enthalten.");
      used.add(importKey);
      const center = record.kostenstelle
        ? config.costCenters.find(
            (item) =>
              normalized(item.name) === normalized(record.kostenstelle) ||
              item.id === record.kostenstelle
          )
        : null;
      if (record.kostenstelle && !center)
        throw new Error(
          `Kostenstelle „${record.kostenstelle}“ zuerst in Schritt 01 anlegen.`
        );
      const value = importNumber(record.wert);
      if (["bilanz", "bestand"].includes(section)) {
        const fields = IMPORT_BALANCE_FIELDS;
        if (["materiallager", "materialbestand"].includes(normalized(name)))
          config.setup.materialStock = Math.abs(value);
        else if (fields[normalized(name)])
          config[fields[normalized(name)]] =
            fields[normalized(name)] === "openingCash"
              ? value
              : Math.abs(value);
        else
          throw new Error(
            "Bestandsposition muss Bankguthaben, Materiallager, Weitere Vermögenswerte oder Weitere Verbindlichkeiten heißen."
          );
        counts.balances++;
        return;
      }
      const isLoan = ["darlehen", "finanzierung"].includes(section);
      const isCost = ["kosten", "betriebskosten"].includes(section);
      const category = IMPORT_ASSET_CATEGORIES[section];
      if (!isLoan && !isCost && !category)
        throw new Error(`Unbekannter Bereich: ${record.bereich}`);
      const listName = isLoan ? "loans" : isCost ? "annualCosts" : "assets";
      const list = config.setup[listName];
      let entry = list.find((item) =>
        record.kennung
          ? item.id === record.kennung
          : normalized(item.name) === normalized(name)
      );
      const id = entry?.id || record.kennung || idFactory();
      if (!IDENTIFIER_PATTERN.test(id))
        throw new Error(
          "Kennung darf nur Buchstaben, Zahlen, Bindestriche und Unterstriche enthalten."
        );
      if (value < 0 && !isLoan)
        throw new Error("Kosten und Anschaffungswerte müssen positiv sein.");
      let data;
      if (isLoan)
        data = createLoanDefaults(id, {
          name, balance: Math.abs(value),
          interestRate: importNumber(record.zinssatz, entry?.interestRate ?? LOAN_DEFAULTS.interestRate),
          repayment: entry?.repayment ?? LOAN_DEFAULTS.repayment,
          centerId: center?.id || entry?.centerId || LOAN_DEFAULTS.centerId,
        });
      else if (isCost) {
        const type = config.costTypes.find(
          (item) =>
            item.id === record.kostenart ||
            normalized(item.name) === normalized(record.kostenart)
        );
        if (!type) throw new Error(`Unbekannte Kostenart: ${record.kostenart}`);
        const catalog = ANNUAL_COST_CATALOG.find((item) => item[0] === type.id);
        data = createAnnualCostDefaults(id, {
          name,
          costTypeId: type.id,
          amount: value,
          actualAmount: importNumber(
            record.istwert,
            entry?.actualAmount ?? null
          ),
          source: "manual",
          centerId: center?.id || entry?.centerId || null,
          keyId: entry?.keyId || catalog?.[2] || "hours"
        });
      } else {
        const acquiredAt = record.anschaffungsdatum || entry?.acquiredAt;
        if (
          !DATE_PATTERN.test(acquiredAt || "") ||
          Number.isNaN(Date.parse(acquiredAt)) ||
          new Date(acquiredAt).toISOString().slice(0, 10) !== acquiredAt
        )
          throw new Error("Anschaffungsdatum im Format JJJJ-MM-TT benötigt.");
        const replacementCost = importNumber(
          record.wiederbeschaffungswert,
          entry?.replacementCost ?? ASSET_DEFAULTS.replacementCost
        );
        data = {
          ...createAssetDefaults(id, acquiredAt),
          ...entry,
          id,
          name,
          category,
          acquiredAt,
          purchaseCost: value,
          replacementCost,
          useReplacement: replacementCost > 0,
          residualValue: importNumber(
            record.restwert,
            entry?.residualValue ?? ASSET_DEFAULTS.residualValue
          ),
          usefulLifeYears: importNumber(
            record.nutzungsdauer,
            entry?.usefulLifeYears ?? ASSET_DEFAULTS.usefulLifeYears
          ),
          usedYears: importNumber(
            record.vergangene_jahre,
            entry?.usedYears ?? ASSET_DEFAULTS.usedYears
          ),
          centerId: center?.id || entry?.centerId || null,
          loanId: entry?.loanId || null,
          maintenance: importNumber(record.wartung, entry?.maintenance ?? ASSET_DEFAULTS.maintenance),
          interestRate: importNumber(record.zinssatz, entry?.interestRate ?? ASSET_DEFAULTS.interestRate),
        };
      }
      if (entry) Object.assign(entry, data);
      else list.push(data);
      counts[listName]++;
    } catch (error) {
      throw new Error(`Zeile ${index + 2}: ${error.message}`);
    }
  });
  return { config, counts };
}
