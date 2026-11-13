import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router";

import { Card, Empty, Table } from "../components/ui.jsx";

const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const STATUS = {
  queued: "OCR wartet",
  processing: "OCR läuft",
  review: "Im Aufmaß prüfen",
  applied: "Übernommen",
  failed: "Fehlgeschlagen",
  queue_failed: "Queue nicht erreichbar"
};

/** Globaler Eingang für ausgefüllte Aufmaßseiten; die Projektzuordnung entsteht erst aus dem QR-Identifier. */
export function MeasurementScanInbox() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/measurement-ocr/scans");
      setScans(data.scans ?? []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Aufmaß-Scans konnten nicht geladen werden."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(load, 0);
    const interval = window.setInterval(load, 10_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES || !ALLOWED_TYPES.has(file.type)) {
      setError("Bitte einen PDF-, JPEG- oder PNG-Scan mit maximal 50 MB auswählen.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name);
      await axios.post("/api/measurement-ocr/scans", body);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Der Aufmaß-Scan konnte nicht hochgeladen werden."
      );
    } finally {
      setUploading(false);
    }
  };

  const retry = async (scan) => {
    setError("");
    try {
      await axios.post(`/api/measurement-ocr/scans/${scan.id}/retry`);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Der OCR-Auftrag konnte nicht erneut gestartet werden."
      );
    }
  };

  return (
    <Card
      title="Aufmaß-Scans"
      description="Ausgefüllte Aufmaßblätter werden über QR-Code und Orientierungsmarker erkannt, dem Projekt zugeordnet und zur Kontrolle in den Aufmaßbereich gestellt."
      actions={
        <label
          className={`cursor-pointer rounded-lg border border-blue-500/60 bg-blue-950/30 px-4 py-2.5 text-sm text-blue-100 ${uploading ? "pointer-events-none opacity-50" : "hover:bg-blue-900/40"}`}
        >
          {uploading ? "Scan wird hochgeladen …" : "Aufmaß-Scan hochladen"}
          <input
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png"
            disabled={uploading}
            onChange={upload}
          />
        </label>
      }
    >
      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}
      {!scans.length && !loading ? (
        <Empty>Noch keine ausgefüllten Aufmaßseiten hochgeladen.</Empty>
      ) : (
        <Table headers={["Scan", "Zuordnung", "Status", "Aktion"]}>
          {scans.map((scan) => (
            <tr key={scan.id}>
              <td>{scan.file?.fileName || "Aufmaß-Scan"}</td>
              <td>
                {scan.project ? (
                  <span>
                    {scan.project.projectNumber ? `${scan.project.projectNumber} · ` : ""}
                    {scan.project.title}
                    {scan.page?.label ? ` · ${scan.page.label}` : ""}
                  </span>
                ) : (
                  <span className="text-gray-400">QR wird gelesen …</span>
                )}
              </td>
              <td>
                <span className={scan.status === "failed" || scan.status === "queue_failed" ? "text-red-300" : scan.status === "review" ? "text-amber-300" : "text-gray-200"}>
                  {STATUS[scan.status] || scan.status}
                </span>
                {scan.error && <p className="mt-1 max-w-md text-xs text-red-300">{scan.error}</p>}
              </td>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  {["failed", "queue_failed", "review"].includes(scan.status) && (
                    <button
                      type="button"
                      onClick={() => retry(scan)}
                      className="rounded-md border border-gray-600 px-3 py-1.5 text-xs hover:bg-gray-700"
                    >
                      OCR erneut starten
                    </button>
                  )}
                  {scan.status === "review" && (
                    <Link
                      to={`/Projects/Aufmas/${scan.project.id}`}
                      className="text-xs text-blue-300 hover:underline"
                    >
                      Im Projekt-Aufmaß öffnen
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
