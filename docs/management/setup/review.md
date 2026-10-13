# 08 · Prüfung und Freigabe

Dieser Schritt prüft die vollständige Grundlage, zeigt eine Preisvorschau und veröffentlicht eine gespeicherte Jahresversion. Die Prüfung ist im Frontend sichtbar und wird auf dem Server erneut durchgeführt.

## Freigabebedingungen

Für beide Modi wird ein Betriebsname benötigt. Easy verlangt mindestens einen positiven Satz. Die Vollkalkulation verlangt zusätzlich eine Hauptkostenstelle, positive Kosten, vollständig verteilte Kosten, positive Stunden bei kostenpflichtigen Bereichen, vollständige Personalanteile und eindeutige Tätigkeitszuordnungen. Maschinen mit Kosten benötigen eine Laufzeit; zusätzliche manuelle Zinsansätze und doppelte Übernahme der Mitarbeiterkosten werden abgefangen.

Ungespeicherte Änderungen müssen zuerst mit **Entwurf speichern** gesichert werden. Der Freigabebutton bleibt bis dahin deaktiviert. Eine veraltete Revision wird vom Server mit `409` abgelehnt; in diesem Fall neu laden und die gespeicherten Daten prüfen.

## Simulation

Je Leistungsbereich werden Stunden eingegeben. Materialeinzelkosten ergänzen die Stundenkosten. Der Gewinnaufschlag wird auf die gesamten Selbstkosten angewendet:

`Selbstkosten = Summe(Stellenstunden × freigegebefähiger Selbstkostensatz) + Materialeinzelkosten`.

`Preisvorschau = Selbstkosten × (1 + Gewinnaufschlag / 100)`.

Beispiel: 2 Stunden zu 50 €/h plus 20 € Material ergeben 120 € Selbstkosten. Mit 10 % Aufschlag beträgt die Vorschau 132 €. Maschinenkosten, die bereits im vollen Stellenstundensatz enthalten sind, werden nicht nochmals hinzugefügt. Die Simulation wird nicht als Geschäftsvorfall gespeichert.

## Versionierung

**Freigeben & Jahresansicht öffnen** speichert eine neue Version mit Zeitpunkt, Benutzer-ID, optionaler Notiz, vollständigen Eingaben, BAB, Planstunden und Sätzen. Es sind maximal 100 Freigaben je Geschäftsjahr möglich. Der Server übernimmt die Historie ausschließlich aus bereits gespeicherten Daten; ein Client kann sie nicht überschreiben.

Nach der Freigabe öffnet die Betriebsübersicht und die Navigation wechselt zur Jahresansicht. Neue Zeitberichte verändern die Stundenanalyse, aber nicht die veröffentlichten Planstunden. Ein bearbeiteter und gespeicherter Entwurf benötigt eine erneute Freigabe, damit neue Plansätze gelten.

Frühere Versionen bleiben in der Historie. **Freigegebene Version ansehen** zeigt deren gespeicherte Sätze. Die Auswahl stellt keine alte Version wieder her und verändert den aktuellen Betrieb nicht.

## Beziehungen im Code

`setup/steps/review.management.jsx` zeigt Prüfungen und Simulation. `config/approval.mjs` enthält die gemeinsamen Freigaberegeln. `configuration.controller.js` wiederholt Prüfung und Berechnung, sichert den Snapshot in `ManagementPeriod.config.setup.approvals` und erhöht die Revision atomar mit dem Auditnachweis.

Weiter: [Betriebsübersicht](../operating/overview.md).
