/** Lädt UTF-8-CSV mit BOM herunter und gibt die temporäre Browser-URL anschließend wieder frei. */
export function downloadCsv(content, name) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
