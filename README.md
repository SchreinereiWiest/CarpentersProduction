# CarpentersProduction

CarpentersProduction ist eine Webanwendung für Kunden-, Projekt-, Datei-, Material- und Zeiterfassungsprozesse einer Schreinerei. Das Repository enthält ein React-Frontend, ein Express-Backend, ein Prisma-Datenmodell für PostgreSQL und eine Docker-Infrastruktur mit Traefik und Garage.

## Dokumentation starten

Die Dokumentation läuft standardmäßig als statische Material-for-MkDocs-Site im Compose-Verbund. Vor dem ersten Compose-Aufruf wird die root `.env` angelegt und mindestens das PostgreSQL-Passwort gesetzt:

```bash
cp .env.example .env
# POSTGRES_PASSWORD in .env durch einen sicheren Wert ersetzen
docker compose up -d --build documentation
```

Traefik veröffentlicht die Dokumentation ohne zusätzlichen Host-Port unter:

```text
http://10.10.100.52/docs/
```

Nach Markdown- oder `mkdocs.yml`-Änderungen wird nur das Dokumentationsimage neu gebaut:

```bash
docker compose up -d --build documentation
docker compose logs -f documentation
```

### Optionaler Autorenmodus ohne Docker

Für Live-Reload kann MkDocs weiterhin lokal ausgeführt werden:

```bash
python3 -m venv .venv-docs
source .venv-docs/bin/activate
python -m pip install -r requirements-docs.txt
mkdocs serve
```

Der lokale Autorenmodus ist unter `http://127.0.0.1:8000/` erreichbar. `mkdocs build --strict` validiert Links und Navigation; der Build landet im ignorierten Verzeichnis `site/`.

## Anwendung starten

Vor dem ersten Start werden ausschließlich lokale Konfigurationsdateien aus den versionierten Vorlagen erzeugt:

```bash
cp .env.example .env
cp Backend/.env.example Backend/.env
cp infra/garage/config/garage.toml.example infra/garage/config/garage.toml
```

Danach müssen alle `CHANGE_ME`-Werte ersetzt werden. Sichere Zufallswerte können beispielsweise mit `openssl rand -hex 32` erzeugt werden. Die drei Zieldateien sind ignoriert und dürfen nicht committed werden.

Die vollständige Entwicklungsumgebung wird aus dem Repository-Stamm gestartet:

```bash
docker compose up --build
```

Nur das Backend lokal starten:

```bash
cd Backend
pnpm install
pnpm exec prisma generate
pnpm run dev
```

Hierfür müssen PostgreSQL, Garage und die in `Backend/.env` beschriebenen Umgebungsvariablen verfügbar sein. Die benötigten Schlüssel sind in den jeweiligen `.example`-Dateien dokumentiert; echte Zugangsdaten gehören nicht in Git.

## Schnellnavigation

- [Dokumentationsstart](docs/index.md)
- [Systemarchitektur](docs/architecture/index.md)
- [Frontend-Dokumentation](docs/frontend/index.md)
- [Backend-Dokumentation](docs/backend/index.md)
- [API-Referenz](docs/backend/api.md)
- [Datenmodell](docs/database/index.md)
- [Betrieb](docs/operations/index.md)

Frontend, Backend, Datenmodell und Infrastruktur sind in der MkDocs-Navigation gemeinsam dokumentiert.
