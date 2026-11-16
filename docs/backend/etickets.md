# PID-Etickets

Der Etikettenfluss verwendet die PID aus der Partlist als durchgängige Programmkennung. Eine physische Kopie erhält zusätzlich die Nesting-Instanz-ID. Der versionierte Scaninhalt ist entweder ein Weblink auf die CNC-Ansicht oder, ohne bekannte Web-Basis, das Schema:

```text
carpenters://part/v1?project=<projectId>&pid=<PID>&instance=<nestingPartId>
```

QR-Weblinks verwenden dieselben Parameter. `CncEditorPage` wertet `pid` aus und wählt das zugehörige CNC-Programm automatisch aus. Das spätere Windows-Maschinenplugin kann beide Formen mit `parsePartCodePayload` aus `Engine/src/eticket` auflösen.

## Druck

`POST /api/etickets/print` benötigt eine angemeldete Sitzung und das Lizenzmerkmal `work-preparation`. Der Browser sendet ausschließlich Bauteildaten. Druckeradresse, Sprache, Etikettenformat und Informationsauswahl stammen mandantenbezogen aus `settings-cnc.json`; dadurch kann ein Benutzer kein beliebiges Netzwerkziel angeben.

`GET /api/etickets/settings` liefert Werkstattbenutzern die Etikettengestaltung für die Vorschau, aber weder Druckerhost noch Port. Es wird lediglich `printerConfigured` offengelegt.

Der Server rendert ZPL oder TSPL und überträgt den Auftrag per Raw-TCP an den konfigurierten Thermodrucker (typischerweise Port 9100). Verbindungsfehler und Timeouts werden als 502 beziehungsweise 504 zurückgegeben.

## Datenfluss

1. Partlist erzeugt die PID.
2. Das Nesting übernimmt das vollständige Originalbauteil und ergänzt die physische Instanz-ID.
3. Im 2D-Nesting wird das Einzelteil direkt ausgewählt; im 1D-Nesting über das Teil im Strip oder den Schnittplan.
4. Das Eticket enthält Projekt, PID und Instanz sowie die konfigurierten Menschen-lesbaren Bauteilinformationen.
5. Ein Scan öffnet das PID-Programm in der CNC-Ansicht; der aktive Postprozessor erzeugt wie bisher den Maschinencode mit PID-basiertem Dateinamen.
