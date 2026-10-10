# CarpentersProduction

CarpentersProduction ist eine Webanwendung für Kunden-, Projekt-, Datei-, Material- und Zeiterfassungsprozesse einer Schreinerei. Das Repository enthält ein React-Frontend, ein Express-Backend, ein Prisma-Datenmodell für PostgreSQL und eine Docker-Infrastruktur mit Traefik und Garage.

## Dokumentation starten

Voraussetzungen sind Python 3 und eine lokale virtuelle Umgebung:

```bash
python3 -m venv .venv-docs
source .venv-docs/bin/activate
python -m pip install -r requirements-docs.txt
mkdocs serve
```

MkDocs bindet sich gemäß `mkdocs.yml` an `0.0.0.0:8000`, damit die Seite auch über eine IDE-, Container- oder SSH-Portweiterleitung erreichbar ist. Lokal lautet die URL `http://127.0.0.1:8000`; in einer Remote-IDE muss stattdessen die für Port 8000 angezeigte weitergeleitete URL geöffnet werden. Einen statischen, streng validierten Build erzeugt:

```bash
mkdocs build --strict
```

Der Build landet im ignorierten Verzeichnis `site/`.

### Dokumentation über Docker und Traefik

Der Compose-Verbund baut die Dokumentation als statische Nginx-Site und veröffentlicht sie über Traefik unter:

```text
http://10.10.100.52/docs/
```

Nur die Dokumentation neu bauen und starten:

```bash
docker compose up -d --build documentation
```

Es wird kein zusätzlicher Host-Port benötigt. Traefik entfernt den Prefix `/docs` vor der Weiterleitung an den Dokumentationscontainer. Nach Markdown-Änderungen muss das Image erneut gebaut werden.

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
- [Backend-Dokumentation](docs/backend/index.md)
- [API-Referenz](docs/backend/api.md)
- [Datenmodell](docs/database/index.md)
- [Betrieb](docs/operations/index.md)

Das Backend ist in dieser ersten Dokumentationsstufe vollständig erfasst. Die Frontend-Dokumentation wird in einer späteren Stufe ergänzt.
