export default function CsvMapping({ fields, headers, mapping, onChange, previewRows }) {
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map(field => <label key={field.id} className="text-sm text-gray-300">
        <span className="mb-1.5 block">{field.label}{field.required ? " *" : ""}</span>
        <select value={mapping[field.id] || ""} onChange={event => onChange(field.id, event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-blue-500">
          <option value="">Nicht übernehmen</option>
          {headers.map(header => <option key={header} value={header}>{header}</option>)}
        </select>
      </label>)}
    </div>
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead className="bg-gray-900 text-xs uppercase tracking-wider text-gray-500"><tr>{fields.filter(field => mapping[field.id]).map(field => <th key={field.id} className="px-4 py-3">{field.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-700">{previewRows.slice(0, 5).map((row, index) => <tr key={index}>{fields.filter(field => mapping[field.id]).map(field => <td key={field.id} className="max-w-64 truncate px-4 py-3 text-gray-300">{row[mapping[field.id]] || "–"}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="text-xs text-gray-500">Vorschau der ersten {Math.min(5, previewRows.length)} von {previewRows.length} Datenzeilen.</p>
  </div>;
}
