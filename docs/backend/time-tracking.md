# Zeiterfassung

`TimeEntry.duration` wird in Minuten gespeichert. `workType` ist ein freier String; die fachlich erlaubten Werte werden über die Company-Einstellungen gepflegt. `customWorkType` wird getrimmt und bei leerem Inhalt zu `null`.

## Projektbezogene Timer-Routen

### Timer starten

`POST /api/projects/time/:id/start` ruft `startTime` auf. `:id` ist die Projekt-ID; der Body enthält `userId`, `workType` und optional `customWorkType`. `startedAt` wird auf den Serverzeitpunkt gesetzt. Erfolg: `201` mit dem Datensatz.

### Timer stoppen

`PATCH /api/projects/time/:id/stop` ruft `stopTime` auf; hier bezeichnet `:id` die **TimeEntry-ID**. Die Dauer wird als abgerundete Differenz zwischen `Date.now()` und `startedAt` in Minuten berechnet. Bei einem Berechnungsfehler wird eine Minute gesetzt. `endedAt` und `duration` werden gespeichert.

!!! note "Antwort ist der alte Stand"
    Der Handler gibt den vor dem Update geladenen Datensatz mit Status `201` zurück. `endedAt` und die neu berechnete Dauer fehlen deshalb in der Antwort.

### Projektzeiten laden

`GET /api/projects/time/:id` lädt alle Einträge des Projekts, absteigend nach `createdAt`, und liefert direkt ein Array. Eine Prüfung, ob der angemeldete Benutzer das Projekt sehen darf, findet nicht statt.

### Dauer ohne Zeitfenster anlegen

`POST /api/projects/time/:id/new` ruft `manualTime` auf. Body: `userId`, `workType`, optional `customWorkType`, `duration`. `startedAt` und `endedAt` bleiben `null`. Diese Einträge erscheinen später unter `/api/time/open` und können Zeitfenstern zugeordnet werden.

## Allgemeine Zeit-Routen

### Tagesansicht

`GET /api/time/day/:date` erwartet `date` als `YYYY-MM-DD`. `getDayEntrys` erzeugt Start und Ende mit dem lokalen Zeitzonenverhalten des Node-Prozesses und lädt alle Einträge mit `startedAt >= Tagesstart` und `< nächster Tagesstart`, aufsteigend sortiert.

Die Abfrage ist nicht auf `req.user.id` eingeschränkt und liefert deshalb die Zeiten aller Benutzer für diesen Tag.

### Offene Zuordnung

`GET /api/time/open` sucht Einträge des angemeldeten Benutzers mit `startedAt: null`. Enthalten ist eine reduzierte Projektrelation `{id,title}`; Sortierung erfolgt absteigend nach `createdAt`.

### Vollständigen Eintrag anlegen

`POST /api/time/new/:id` verwendet `:id` als Projekt-ID. Erwarteter Body:

```json
{
  "userId": "UUID",
  "workType": "Montage",
  "customWorkType": null,
  "startTime": "2026-10-10T08:00:00.000Z",
  "endTime": "2026-10-10T09:30:00.000Z",
  "duration": 90
}
```

`newTime` übernimmt Zeitpunkte und Dauer ohne Plausibilitätsprüfung. Erfolg: `201`.

### Dauer zuordnen oder splitten

`PATCH /api/time/:id/assign` ordnet einen offenen Dauer-Eintrag einem oder mehreren lückenunabhängigen Zeitsegmenten zu. Zulässig ist der Eigentümer oder ein Admin.

Bevorzugter Body:

```json
{
  "segments": [
    {
      "startTime": "2026-10-10T08:00:00.000Z",
      "endTime": "2026-10-10T08:30:00.000Z",
      "duration": 30
    },
    {
      "startTime": "2026-10-10T10:00:00.000Z",
      "endTime": "2026-10-10T10:30:00.000Z",
      "duration": 30
    }
  ]
}
```

Alternativ werden `startTime` und `endTime` als einzelnes Segment akzeptiert; dessen Dauer stammt dann aus dem vorhandenen Eintrag. Jedes Segment muss eine positive ganzzahlige Minutendauer besitzen, exakt seiner Zeitdifferenz entsprechen, und die Summe muss exakt der ursprünglichen Dauer entsprechen. Das erste Segment aktualisiert den vorhandenen Datensatz; weitere werden in einer Prisma-Transaktion erzeugt.

Antwort: `{ "entries": [...], "split": true|false }`. Fehler: `404` unbekannt, `403` fremder Eintrag, `409` bereits zugeordnet, `400` ungültige Segmente.

### Eintrag bearbeiten

`PATCH /api/time/:id` erwartet `projectId`, `workType`, optional `customWorkType`, `startTime`, `endTime` und `duration`. Die Zeitpunkte müssen gültig und aufsteigend sein; `duration` muss nur positiv und endlich sein, wird aber nicht gegen die Zeitdifferenz geprüft. Eigentümer und Admins dürfen ändern.

## Wochen-JSON

`POST /api/time/uploadWeek/:id/:date` serialisiert den gesamten Body als `weekData-{date}.json` und speichert ihn unter `Time/{id}/...`. `:id` ist die Benutzer-ID. Ein vorhandener Datensatz wird überschrieben, andernfalls werden `S3Object` und `File` angelegt.

`GET /api/time/downloadWeek/:id/:date` liefert `{exists:false}` oder eine 900 Sekunden gültige `downloadUrl`. Beide Endpunkte prüfen zwar ein gültiges Login, aber nicht, ob `:id` dem angemeldeten Benutzer entspricht.
