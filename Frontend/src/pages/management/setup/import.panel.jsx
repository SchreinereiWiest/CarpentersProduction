import { downloadCsv } from '../utils/fileDownload.js';
import { IMPORT_LIMITS } from '../../../../../shared/management/defaults/import.defaults.mjs';
import { useState } from "react";
import { IMPORT_TEMPLATE } from '../../../../../shared/management/defaults/import.defaults.mjs';
import { importManagementCsv } from '../../../../../shared/management/imports/csv.mjs';
import { createUuid } from '../utils/uuid.js';
import { Button, Card, Notice } from '../components/ui.jsx';

/** Prüft CSV-Dateien lokal, zeigt Importumfang und Fehler und übernimmt ausgewählte Daten erst ausdrücklich in den Entwurf. */
export default function SetupImport({ config, change, year }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  return (
    <Card
      title="Vorhandene Kalkulationsdaten importieren"
      description="CSV für Anlagen, Restschulden, Bestände und jährliche Kosten. Der Import wird zuerst geprüft und danach in den Entwurf übernommen. Eine direkte DATEV-Anbindung ist noch nicht eingerichtet."
      actions={
        <Button
          secondary
          onClick={() =>
            downloadCsv(IMPORT_TEMPLATE, "Betrieb-Import-Vorlage.csv")
          }
        >
          CSV-Vorlage herunterladen
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-gray-400">
          Bereiche: maschine, cnc, fahrzeug, gebäude, ausstattung, darlehen,
          kosten oder bilanz. Beträge ohne Umsatzsteuer; bei Bilanzbeständen die
          tatsächlichen Bestandswerte verwenden. Wiederholte Kennungen ersetzen
          vorhandene Positionen; ohne Kennung wird der Positionsname
          abgeglichen.
        </p>
        <label className="block text-sm">
          CSV-Datei auswählen
          <input
            aria-label="CSV-Datei auswählen"
            className="mt-2 block text-sm"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              setPreview(null);
              setError("");
              const file = e.target.files[0];
              if (!file) return;
              try {
                if (file.size > IMPORT_LIMITS.bytes)
                  throw new Error("Datei darf maximal 2 MB groß sein.");
                setPreview(
                  importManagementCsv(await file.text(), config, createUuid)
                );
              } catch (err) {
                setError(err.message);
              }
              e.target.value = "";
            }}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        {preview && (
          <Notice>
            {preview.counts.assets} Anlagen · {preview.counts.loans} Darlehen ·{" "}
            {preview.counts.annualCosts} Kostenpositionen ·{" "}
            {preview.counts.balances} Bestände geprüft. Vorhandene Positionen
            werden bei gleicher Kennung oder gleichem Namen aktualisiert.
            <Button
              className="ml-3"
              onClick={() => {
                change((c) => {
                  Object.assign(c, preview.config);
                });
                setPreview(null);
              }}
            >
              In Entwurf übernehmen
            </Button>
          </Notice>
        )}
        <p className="text-xs text-gray-500">
          Import gilt für Geschäftsjahr {year}. Erst „Speichern“ übernimmt den
          Entwurf dauerhaft; eine Freigabe erfolgt separat in Schritt 08.
        </p>
      </div>
    </Card>
  );
}
