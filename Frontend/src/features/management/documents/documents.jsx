import { DocumentInbox } from './documentInbox.jsx';
import { MeasurementScanInbox } from './measurementScanInbox.jsx';

/** Zeigt die Betriebsdokumentenablage ohne die entfernte Erfassung einzelner Geschäftsvorfälle. */
export function ManagementDocuments() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Dokumente</h1>
        <p className="mt-2 text-sm text-gray-400">
          Betriebsbelege sammeln. Die Erfassung einzelner Geschäftsvorfälle ist
          derzeit ausgeblendet.
        </p>
      </header>
      <MeasurementScanInbox />
      <DocumentInbox />
    </div>
  );
}
