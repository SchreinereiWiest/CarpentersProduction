/** Gemeinsame Eingabefeldgestaltung und optionale Eigenschaften der Management-Komponenten. */
export const inputClass = 'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50';
export const UI_DEFAULTS = { secondary: false, danger: false, className: '', inputType: 'text', numberStep: '0.01', warning: false, confirmLabel: 'Löschen', sidebarSelected: 1, setupMode: false };
export const DOCUMENT_DEFAULTS = { maxBytes: 50 * 1024 * 1024, mimeTypes: ['application/pdf', 'image/jpeg'] };
export const EMPTY_REFERENCES = { files: [], employees: [] };
export const FORMAT_DEFAULTS = { locale: 'de-DE', currency: 'EUR', decimalPlaces: 2 };
