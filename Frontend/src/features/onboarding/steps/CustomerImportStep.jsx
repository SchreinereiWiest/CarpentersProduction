import { useState } from "react";
import axios from "axios";
import CsvMapping from "../components/CsvMapping.jsx";
import { inferColumn, mappedValue, parseDelimitedText } from "../csvImport.js";

const fields = [
  { id: "customerNumber", label: "Kundennummer", aliases: ["kundennummer", "kundennr", "customerid", "customernumber"] },
  { id: "companyName", label: "Firma", aliases: ["firma", "firmenname", "company", "companyname"] },
  { id: "firstName", label: "Vorname", aliases: ["vorname", "firstname", "givenname"] },
  { id: "lastName", label: "Nachname", aliases: ["nachname", "lastname", "surname"] },
  { id: "email", label: "E-Mail", aliases: ["email", "emailadresse", "mail"] },
  { id: "phoneMobile", label: "Mobil", aliases: ["mobil", "mobile", "handy", "telefonmobil"] },
  { id: "phoneLandline", label: "Festnetz", aliases: ["telefon", "festnetz", "phone", "landline"] },
  { id: "street", label: "Straße", aliases: ["strasse", "straße", "street"] },
  { id: "houseNumber", label: "Hausnummer", aliases: ["hausnummer", "hausnr", "housenumber"] },
  { id: "postalCode", label: "PLZ", aliases: ["plz", "postleitzahl", "zipcode", "postalcode"] },
  { id: "city", label: "Ort", aliases: ["ort", "stadt", "city"] },
  { id: "country", label: "Land", aliases: ["land", "country"] },
  { id: "notes", label: "Notiz", aliases: ["notiz", "notizen", "notes", "bemerkung"] }
];

export default function CustomerImportStep() {
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
      if (result.rows.length > 1000) throw new Error("Pro Import sind höchstens 1.000 Kontakte möglich.");
      setParsed(result);
      setFileName(file.name);
      setMapping(Object.fromEntries(fields.map(field => [field.id, inferColumn(result.headers, field.aliases)])));
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Die Kontaktliste konnte nicht gelesen werden." });
    }
  };

  const importRows = async () => {
    if (!parsed || !(mapping.companyName || mapping.firstName || mapping.lastName)) {
      setMessage({ type: "error", text: "Ordne mindestens Firma, Vorname oder Nachname zu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const customers = parsed.rows.map(row => Object.fromEntries(fields.map(field => [field.id, mappedValue(row, mapping, field.id)])))
        .filter(customer => customer.companyName || customer.firstName || customer.lastName);
      const { data } = await axios.post("/api/customers/import", { customers });
      setMessage({ type: "success", text: `${data.imported} Kontakte importiert${data.skipped ? `, ${data.skipped} vorhandene Kontakte übersprungen` : ""}.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Die Kontakte konnten nicht importiert werden." });
    } finally {
      setBusy(false);
    }
  };

  return <div className="h-full overflow-y-auto p-5 sm:p-7">
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Kundenstamm</p><h1 className="mt-2 text-2xl font-semibold">Kontakte importieren</h1><p className="mt-2 max-w-3xl text-sm text-gray-400">Übernimm bestehende Kunden aus einer CSV-Datei. Kundennummer und E-Mail werden zur Duplikaterkennung genutzt. Fehlende optionale Felder können einfach unzugeordnet bleiben.</p></div>
      <label className="block cursor-pointer rounded-2xl border border-dashed border-blue-800 bg-blue-950/20 p-7 hover:bg-blue-950/35"><div className="flex items-center gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-600 text-2xl">↥</span><span><span className="block font-semibold">CSV-Kontaktliste auswählen</span><span className="mt-1 block text-sm text-gray-400">Bis zu 1.000 Kontakte pro Import · CSV mit Komma oder Semikolon</span></span></div><input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={event => selectFile(event.target.files?.[0])} /></label>
      {message && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/30 text-green-300" : "border-red-800 bg-red-950/30 text-red-300"}`}>{message.text}</div>}
      {parsed && <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Spalten zuordnen · {fileName}</h2><p className="mt-1 text-sm text-gray-500">{parsed.rows.length} Kontakte erkannt</p></div><button type="button" disabled={busy || !(mapping.companyName || mapping.firstName || mapping.lastName)} onClick={importRows} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-40">{busy ? "Wird importiert …" : "Kontakte importieren"}</button></div><CsvMapping fields={fields} headers={parsed.headers} mapping={mapping} previewRows={parsed.rows} onChange={(key, value) => setMapping(current => ({ ...current, [key]: value }))} /></section>}
    </div>
  </div>;
}
