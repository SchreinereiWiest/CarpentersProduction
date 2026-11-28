import { useState } from "react";
import { loadProcurementCatalog, saveProcurementCatalog } from "../../purchasing/procurementApi.js";
import CsvMapping from "../components/CsvMapping.jsx";
import { inferColumn, mappedValue, parseDelimitedText } from "../csvImport.js";

const fields = [
  { id: "name", label: "Artikelname", required: true, aliases: ["name", "artikel", "artikelname", "bezeichnung"] },
  { id: "sku", label: "Artikelnummer", aliases: ["sku", "artikelnummer", "artnr", "nummer"] },
  { id: "category", label: "Kategorie", aliases: ["kategorie", "category", "warengruppe"] },
  { id: "description", label: "Beschreibung", aliases: ["beschreibung", "description", "text"] },
  { id: "unit", label: "Einheit", aliases: ["einheit", "unit", "mengeneinheit"] },
  { id: "netPrice", label: "Nettopreis", aliases: ["nettopreis", "preis", "price", "ekpreis"] },
  { id: "imageUrl", label: "Bild-URL", aliases: ["bildurl", "imageurl", "bild", "image"] }
];

const parsePrice = value => {
  const normalized = String(value || "0").replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : 0;
};

export default function ShopImportStep() {
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const selectFile = async file => {
    if (!file) return;
    setMessage(null);
    try {
      const result = parseDelimitedText(await file.text());
      setParsed(result);
      setFileName(file.name);
      setMapping(Object.fromEntries(fields.map(field => [field.id, inferColumn(result.headers, field.aliases)])));
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Die Artikelliste konnte nicht gelesen werden." });
    }
  };

  const importRows = async () => {
    if (!parsed || !mapping.name) {
      setMessage({ type: "error", text: "Bitte ordne mindestens den Artikelnamen zu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const catalog = await loadProcurementCatalog();
      const articles = [...(catalog.articles || [])];
      let imported = 0;
      let updated = 0;
      for (const row of parsed.rows) {
        const name = mappedValue(row, mapping, "name").trim();
        if (!name) continue;
        const sku = mappedValue(row, mapping, "sku").trim();
        const data = {
          name,
          sku,
          category: mappedValue(row, mapping, "category").trim(),
          description: mappedValue(row, mapping, "description").trim(),
          unit: mappedValue(row, mapping, "unit").trim() || "Stk.",
          netPrice: parsePrice(mappedValue(row, mapping, "netPrice")),
          imageUrl: mappedValue(row, mapping, "imageUrl").trim(),
          imageFileId: null,
          supplierId: null,
          groupId: null
        };
        const existingIndex = sku ? articles.findIndex(article => String(article.sku || "").toLocaleLowerCase("de-DE") === sku.toLocaleLowerCase("de-DE")) : -1;
        if (existingIndex >= 0) {
          articles[existingIndex] = { ...articles[existingIndex], ...data };
          updated += 1;
        } else {
          articles.push({ id: crypto.randomUUID(), ...data });
          imported += 1;
        }
      }
      await saveProcurementCatalog({ version: 1, articles, groups: catalog.groups || [] });
      setMessage({ type: "success", text: `${imported} Artikel importiert, ${updated} über die Artikelnummer aktualisiert.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.response?.data?.error || "Die Artikelliste konnte nicht importiert werden." });
    } finally {
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto p-5 sm:p-7">
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Vorhandene Daten</p><h1 className="mt-2 text-2xl font-semibold">Artikellisten übernehmen</h1><p className="mt-2 max-w-3xl text-sm text-gray-400">Importiere eine CSV-Liste in den Shop-Katalog. Vorhandene Artikel mit gleicher Artikelnummer werden aktualisiert; bestehende Gruppen und manuell angelegte Artikel bleiben erhalten.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="group cursor-pointer rounded-2xl border border-dashed border-blue-800 bg-blue-950/20 p-6 hover:bg-blue-950/35"><span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-xl">↥</span><span className="mt-4 block font-semibold">CSV-Artikelliste auswählen</span><span className="mt-1 block text-sm text-gray-400">Komma oder Semikolon, Anführungszeichen werden unterstützt.</span><input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={event => selectFile(event.target.files?.[0])} /></label>
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6"><span className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-xl text-amber-300">D</span><h2 className="mt-4 font-semibold">DATANORM und Lieferantenlisten</h2><p className="mt-1 text-sm text-gray-400">Lieferanten mit DATANORM-Dateien werden im vorherigen Schritt „Shop & Lieferanten“ eingerichtet. Die Daten stehen danach automatisch für den Artikelabruf bereit.</p></div>
      </div>
      {message && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/30 text-green-300" : "border-red-800 bg-red-950/30 text-red-300"}`}>{message.text}</div>}
      {parsed && <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Spalten zuordnen · {fileName}</h2><p className="mt-1 text-sm text-gray-500">{parsed.rows.length} Zeilen erkannt · Trennzeichen {parsed.delimiter === ";" ? "Semikolon" : "Komma"}</p></div><button type="button" disabled={busy || !mapping.name} onClick={importRows} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40">{busy ? "Wird importiert …" : "Artikel importieren"}</button></div><CsvMapping fields={fields} headers={parsed.headers} mapping={mapping} previewRows={parsed.rows} onChange={(key, value) => setMapping(current => ({ ...current, [key]: value }))} /></section>}
    </div>
  </div>;
}
