const quote = value => {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@-]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const numeric = value => value === null ? '' : Number(value).toFixed(2).replace('.', ',');
export function exportBab(calculation, config, year, basis, draft) {
  const rows = [
    [`BAB ${year}`, basis === 'plan' ? 'Plan' : 'Ist', draft ? 'Ungespeicherte Vorschau' : 'Gespeichertes Betriebsmodell'],
    ['Kostenart', 'Gesamt EUR', 'Nicht verteilt EUR', ...config.costCenters.map(center => center.name)],
    ...calculation.rows.map(row => [row.name, row.total.toFixed(2).replace('.', ','), row.unallocated.toFixed(2).replace('.', ','), ...config.costCenters.map(center => row.values[center.id].toFixed(2).replace('.', ','))]),
    ['Stellenkosten nach Umlage', numeric(calculation.totalCosts), numeric(calculation.unallocated), ...calculation.rates.map(rate => numeric(rate.total))],
    ['Vollstundensatz EUR/h', '', '', ...calculation.rates.map(rate => rate.kind === 'support' ? '' : numeric(rate.fullRate))],
  ];
  const blob = new Blob(['\uFEFF', rows.map(row => row.map(quote).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `BAB-${year}-${basis}${draft ? '-Vorschau' : ''}.csv`; anchor.click();
  URL.revokeObjectURL(url);
}
