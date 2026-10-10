# Frontend

Das Frontend basiert auf React und Vite. Die ausführliche Dokumentation von Komponenten, Hooks, State-Management, Seiten und API-Aufrufen folgt in einer späteren Ausbaustufe.

Bereits feststehende Schnittstellen zum Backend:

- API-Prefix `/api`
- Anmeldung über den HTTP-only-Cookie `token`
- JSON-Nutzdaten für Stammdaten, Projekte, Einstellungen und Zeiten
- `multipart/form-data` für Datei- und Projektarchiv-Uploads
- signierte URLs für Downloads aus Garage

Die verbindliche Beschreibung der aktuell verfügbaren Schnittstellen steht in der [Backend-API-Referenz](../backend/api.md).
