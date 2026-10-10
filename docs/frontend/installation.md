# Installation und Entwicklung

## Voraussetzungen

- Node.js 22
- pnpm
- laufendes Backend unter demselben Origin oder ein passender Vite-Proxy

## Lokaler Start

```bash
cd Frontend
pnpm install
pnpm run dev
```

Vite lauscht wegen `server.host: true` auf allen Interfaces. Dateibeobachtung verwendet Polling, damit Hot Reload auch mit Docker-Bind-Mounts funktioniert.

## Compose

Aus dem Repository-Stamm:

```bash
docker compose up -d --build frontend backendjs
docker compose logs -f frontend
```

Der Frontend-Container stellt Vite intern auf Port `5173` bereit. Traefik veröffentlicht die Anwendung über die Host-Regel `10.10.100.52` auf dem Web-EntryPoint. `/api` besitzt eine höhere Router-Priorität und wird an das Backend weitergeleitet; `/docs/` geht an den Dokumentationscontainer.

## Befehle

| Befehl | Zweck |
|---|---|
| `pnpm run dev` | Vite-Entwicklungsserver mit HMR |
| `pnpm run build` | optimierter Produktionsbuild nach `dist/` |
| `pnpm run preview` | lokalen Vite-Build vorab anzeigen |
| `pnpm run lint` | ESLint über das Frontend ausführen |

## Build und Laufzeit

Das aktuelle Dockerfile führt während des Image-Builds `pnpm run build` aus, startet danach aber den Vite-Entwicklungsserver. Für einen echten Produktionsbetrieb sollte `dist/` von einem statischen Webserver ausgeliefert werden. API-Pfade sind relativ; Frontend und Backend sollten deshalb über denselben öffentlichen Origin erreichbar sein.

## Wichtige Dateien

| Datei | Aufgabe |
|---|---|
| `src/main.jsx` | Provider, Router und Seitenzuordnung |
| `src/index.css` | globale Styles und Tailwind-Einbindung |
| `vite.config.js` | React-/Tailwind-Plugins und Dev-Server |
| `Dockerfile` | Node-/pnpm-Image und Containerstart |
| `package.json` | Abhängigkeiten und Skripte |

