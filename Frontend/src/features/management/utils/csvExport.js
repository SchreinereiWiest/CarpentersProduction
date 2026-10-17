import { downloadCsv } from './fileDownload.js';
/** Maskiert CSV-Zellen und verhindert, dass Bezeichnungen als Tabellenformeln interpretiert werden. */
const quote = (value) => {
  const text = String(value ?? "");
  const safe =
    /^[\s]*[=+@-]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
/** Formatiert CSV-Zahlen mit Dezimalkomma; fehlende Stundensätze bleiben leer. */
const numeric = (value) =>
  value === null ? "" : Number(value).toFixed(2).replace(".", ",");
/** Exportiert die Plan-Kostenarten, Verteilungen und Vollstundensätze und kennzeichnet ungespeicherte Vorschauen im Dateinamen. */
export function exportBab(calculation, config, year, draft) {
  const rows = [
    [
      `BAB ${year}`,
      "Plan",
      draft ? "Ungespeicherte Vorschau" : "Gespeichertes Betriebsmodell"
    ],
    [
      "Kostenart",
      "Gesamt EUR",
      "Nicht verteilt EUR",
      ...config.costCenters.map((center) => center.name)
    ],
    ...calculation.rows.map((row) => [
      row.name,
      row.total.toFixed(2).replace(".", ","),
      row.unallocated.toFixed(2).replace(".", ","),
      ...config.costCenters.map((center) =>
        row.values[center.id].toFixed(2).replace(".", ",")
      )
    ]),
    [
      "Stellenkosten nach Umlage",
      numeric(calculation.totalCosts),
      numeric(calculation.unallocated),
      ...calculation.rates.map((rate) => numeric(rate.total))
    ],
    [
      "Vollstundensatz EUR/h",
      "",
      "",
      ...calculation.rates.map((rate) =>
        rate.kind === "support" ? "" : numeric(rate.fullRate)
      )
    ]
  ];
  downloadCsv(rows.map(row => row.map(quote).join(';')).join('\r\n'), `BAB-${year}-plan${draft ? '-Vorschau' : ''}.csv`);
}
