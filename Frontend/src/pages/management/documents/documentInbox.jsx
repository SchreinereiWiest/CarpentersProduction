import { DOCUMENT_DEFAULTS } from '../defaults/ui.defaults.js';
import { useState } from 'react';
import axios from 'axios';
import { useManagement } from '../hooks/useManagement.js';
import { Card, ConfirmButton, Empty, Table } from '../components/ui.jsx';

/** Lädt Betriebsbelege hoch, öffnet geschützte Downloads und entfernt Dateien nach Bestätigung; daraus werden keine Kosten gebucht. */
export function DocumentInbox() {
  const { references, refresh, busy } = useManagement();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const files = references.files.filter(
    (file) => file.category === "management-document"
  );
  /** Prüft Typ und Größe einer Belegdatei, lädt sie hoch und aktualisiert den geschützten Belegeingang. */
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (
      file.size > DOCUMENT_DEFAULTS.maxBytes ||
      !DOCUMENT_DEFAULTS.mimeTypes.includes(file.type)
    ) {
      setError("Bitte PDF oder JPG mit maximal 50 MB auswählen.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name);
      await axios.post("/api/files/management-document", body);
      await refresh();
    } catch (err) {
      setError(
        err.response?.data?.message || "Beleg konnte nicht hochgeladen werden."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  /** Öffnet eine vom Backend freigegebene Download-URL in einem getrennten Browserfenster. */
  const download = async (file) => {
    setError("");
    try {
      const { data } = await axios.get(`/api/files/download/${file.id}`);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Beleg konnte nicht geöffnet werden.");
    }
  };
  /** Entfernt die gewählte Belegdatei über die geschützte Datei-API und aktualisiert die Referenzen. */
  const remove = async (file) => {
    setError("");
    setUploading(true);
    try {
      await axios.delete(`/api/files/delete/${file.id}`);
      await refresh();
      return true;
    } catch (err) {
      setError(
        err.response?.data?.message || "Beleg konnte nicht entfernt werden."
      );
      return false;
    } finally {
      setUploading(false);
    }
  };
  return (
    <Card
      title="Belegeingang"
      description="Dokumente sammeln und öffnen. Die Kalkulation arbeitet derzeit mit Jahreskosten und Zeitberichten; eine automatische Übernahme ist für die spätere DATEV-Anbindung vorgesehen."
      actions={
        <label
          className={`cursor-pointer rounded-lg border border-gray-600 px-4 py-2.5 text-sm ${uploading || busy ? "pointer-events-none opacity-50" : "hover:bg-gray-700"}`}
        >
          {uploading ? "Lädt hoch …" : "Beleg hochladen"}
          <input
            aria-label="Beleg hochladen"
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg"
            disabled={busy || uploading}
            onChange={upload}
          />
        </label>
      }
    >
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {!files.length ? (
        <Empty>
          Noch keine Betriebsbelege vorhanden. PDF oder JPG hochladen.
        </Empty>
      ) : (
        <Table headers={["Beleg", "Aktion"]}>
          {files.map((file) => (
            <tr key={file.id}>
              <td>
                <button
                  className="text-blue-300 hover:underline"
                  onClick={() => download(file)}
                >
                  {file.fileName}
                </button>
              </td>
              <td>
                <div className="flex flex-wrap items-center gap-3">
                  <ConfirmButton
                    disabled={busy || uploading}
                    message="Diese Belegdatei entfernen?"
                    onConfirm={() => remove(file)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
