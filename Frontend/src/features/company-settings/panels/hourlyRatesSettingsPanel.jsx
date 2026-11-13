import { useEffect, useState } from "react";
import axios from "axios";

const currentYear = Number(new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric"
}).format(new Date()));

export default function HourlyRatesSettingsPanel() {
  const [year, setYear] = useState(currentYear);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    axios.get("/api/settings/hourly-rates", { params: { year } })
      .then(({ data }) => { if (active) setRates(data.rates || []); })
      .catch(() => { if (active) setMessage({ type: "error", text: "Stundensätze konnten nicht geladen werden." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year]);

  const changeRate = (id, field, value) => {
    setRates((current) => current.map((rate) => rate.id === id ? { ...rate, [field]: value } : rate));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await axios.put("/api/settings/hourly-rates", { rates }, { params: { year } });
      setRates(data.rates || []);
      setMessage({ type: "success", text: "Stundensätze wurden gespeichert." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Stundensätze konnten nicht gespeichert werden." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Stundensätze</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">Direkte Selbstkostensätze für die Projektkalkulation. Dieser Bereich bleibt verfügbar, wenn Kalkulation lizenziert ist, aber kein Betriebsmanagement.</p>
          </div>
          <label className="text-sm text-gray-300">Geschäftsjahr
            <input
              type="number"
              min="2000"
              max="2200"
              value={year}
              onChange={(event) => {
                setLoading(true);
                setMessage(null);
                setYear(Number(event.target.value));
              }}
              className="ml-3 w-24 rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
            />
          </label>
        </div>

        {message && <div className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-green-800 bg-green-950/40 text-green-300" : "border-red-800 bg-red-950/40 text-red-300"}`}>{message.text}</div>}

        <section className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold">Leistungsbereiche</h2><p className="mt-1 text-sm text-gray-500">Die Kalkulation übernimmt diese Sätze als auswählbare Kostenbasis.</p></div>
            <button type="button" onClick={() => setRates((current) => [...current, { id: crypto.randomUUID(), name: "Neuer Leistungsbereich", rate: 0 }])} className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-700">+ Stundensatz</button>
          </div>

          {loading ? <p className="mt-6 text-sm text-gray-500">Stundensätze werden geladen …</p> : (
            <div className="mt-5 space-y-3">
              {rates.map((rate) => (
                <div key={rate.id} className="grid gap-3 rounded-lg border border-gray-700 p-4 sm:grid-cols-[2fr_1fr_auto]">
                  <label className="text-sm text-gray-300">Leistungsbereich<input value={rate.name} onChange={(event) => changeRate(rate.id, "name", event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-white" /></label>
                  <label className="text-sm text-gray-300">Selbstkosten €/h<input type="number" min="0" step="0.01" value={rate.rate} onChange={(event) => changeRate(rate.id, "rate", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-right text-white" /></label>
                  <button type="button" onClick={() => setRates((current) => current.filter((item) => item.id !== rate.id))} className="self-end rounded-lg border border-red-900 px-4 py-2.5 text-sm text-red-300 hover:bg-red-950/40">Entfernen</button>
                </div>
              ))}
              {!rates.length && <div className="rounded-lg border border-dashed border-gray-600 p-8 text-center text-sm text-gray-500">Noch keine Stundensätze hinterlegt.</div>}
            </div>
          )}
        </section>

        <div className="flex justify-end"><button type="button" onClick={save} disabled={loading || saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{saving ? "Speichert …" : "Stundensätze speichern"}</button></div>
      </div>
    </div>
  );
}
