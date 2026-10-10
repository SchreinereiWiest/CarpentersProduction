# Infrastruktur

## Docker Compose

Der vorhandene Compose-Verbund definiert sechs Dienste:

| Dienst | Aufgabe | Interner Port |
|---|---|---:|
| `traefik` | Reverse Proxy und Routing | 80, Dashboard 8080 |
| `frontend` | React/Vite-Anwendung | 5173 |
| `backendjs` | Express-API | 5000 |
| `documentation` | statisch gebautes MkDocs über Nginx | 80 |
| `postgres` | PostgreSQL 16 | 5432 |
| `garage` | S3-kompatibler Objektspeicher | 3900 |

Alle Dienste verwenden `carpenters-network`. Traefik priorisiert `/api` vor dem allgemeinen Frontend-Router.

## Dokumentation

`Dockerfile.docs` baut die Markdown-Dateien in einer Python-Builder-Stufe mit `mkdocs build --strict`. Das fertige `site/` wird anschließend von einem kleinen Nginx-Container ausgeliefert. Traefik veröffentlicht diesen Dienst unter `http://10.10.100.52/docs/`, entfernt den Prefix `/docs` und gibt der Route eine höhere Priorität als dem allgemeinen Frontend-Router.

```bash
docker compose up -d --build documentation
```

Der Container benötigt keinen direkt veröffentlichten Port. Änderungen an Markdown oder `mkdocs.yml` erfordern einen erneuten Image-Build.

## Garage

Das Backend verwendet path-style S3-Zugriffe und die feste SDK-Region `garage`. Uploads und Löschungen laufen über `S3_ENDPOINT`; signierte Browser-Downloads über `S3_PUBLIC_ENDPOINT`.

Die echte `infra/garage/config/garage.toml` enthält `rpc_secret` und `admin_token` und wird deshalb nicht versioniert. Für eine neue Entwicklungsumgebung wird sie aus der sicheren Vorlage erzeugt:

```bash
cp infra/garage/config/garage.toml.example infra/garage/config/garage.toml
```

Anschließend müssen die `CHANGE_ME`-Werte ersetzt werden. Für `rpc_secret` ist ein 64-stelliger Hexwert erforderlich, beispielsweise aus `openssl rand -hex 32`.

Persistente Garage-Daten liegen laut Compose unter `infra/garage/meta` und `infra/garage/data`. Sie gehören zusammen mit der Garage-Konfiguration in das Backup-Konzept.

## Traefik

Das Dashboard ist im Ist-Stand als unsicheres Dashboard auf Port 8080 aktiviert. Hostregeln und IP-Adressen sind direkt in `compose.yaml` hinterlegt. Vor einem produktiven Einsatz sollten TLS, Dashboard-Schutz und konfigurierbare Hosts eingerichtet werden.

## Kubernetes

Im Repository sind derzeit keine Kubernetes-Manifeste vorhanden. Für eine spätere Migration werden mindestens Deployments für Frontend und Backend, ein PostgreSQL-Konzept, Garage/PersistentVolumes, Services, Ingress, Secrets, ConfigMaps sowie Readiness-/Liveness-Probes benötigt.
