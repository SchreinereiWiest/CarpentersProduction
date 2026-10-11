export const money = value => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
export const decimal = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(Number(value || 0));
export const dateLabel = value => value ? new Intl.DateTimeFormat('de-DE').format(new Date(String(value).slice(0, 10) + 'T12:00:00')) : '–';
