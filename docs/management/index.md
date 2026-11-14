# Management-Arbeitsbereich

Der Managementbereich unterstützt die tägliche Kapazitäts- und Projektsteuerung sowie die jährliche Ziel- und Stundensatzplanung. Einzelne Geschäftsvorfälle, Zahlungen oder eine Finanzbuchhaltung gehören ausdrücklich nicht zum aktiven Funktionsumfang.

## Bereiche

1. **Mitarbeiterauslastung:** zeigt alle registrierten Firmenkonten und ihre Projektzuweisungen. Darunter stehen produktive Stunden je Kostenstelle, maximale Jahresarbeitszeit, stündlich verrechneter Kalenderurlaub sowie Urlaubstage und Jahresgehalt.
2. **Projektstatus:** ein spaltenbasiertes Board. Neue oder noch nicht eingeordnete Projekte erscheinen in der ersten konfigurierten Spalte. Verschieben ändert ausschließlich `ManagementProjectStage`.
3. **Projektzeitraum:** ein projektbezogenes Tages-Gantt verwaltet frei benennbare Zeilen wie Aufmaß, Planung, Fertigung und Montage. Balken werden mit zwei Klicks gezeichnet, per Drag-and-drop verschoben und per Doppelklick in ihrer Dauer geändert. Der Gesamtzeitraum entsteht automatisch aus allen Balken.
4. **Jahresziele:** jeder Eintrag besitzt Zieltyp, Sollwert, Einheit und Stichtag. Zwischenstände werden als eigene Datensätze gespeichert; Istwert und Ist-Datum schließen den Vergleich ab. Über die Jahresauswahl bleiben Vorjahre einsehbar.
5. **Stundensätze:** berechnet pro Unternehmenstätigkeit Basis-, Maschinen-, Selbstkosten- und Verkaufssatz. Die Tätigkeits-ID verbindet den Satz mit Zeiterfassung und Projektkalkulation. Zeitbuchungen können kontrolliert als Maschinenstunden-Vorschlag übernommen werden.

## Konfiguration

Unter **Firmeneinstellungen → Advanced → Management** werden Reihenfolge und Bezeichnung der Boardspalten sowie die verfügbaren Zieltypen und Einheiten gepflegt. Diese Konfiguration liegt in `settings-company.json`. Bereits angelegte Jahresziele speichern Bezeichnung und Einheit als historische Momentaufnahme.

Die Unternehmenstätigkeiten und die tagesgenaue Arbeitswoche werden weiterhin im Reiter **Unternehmen** gepflegt. Arbeitsbeginn, Arbeitsende und Pausen sind je Wochentag unabhängig. Wiederkehrende Regeln wie „jeder zweite Freitag frei“ wirken direkt auf Kapazität, Urlaub und Mitarbeiter-Zeiterfassung. Arbeitsblöcke abzüglich der tagesgültigen Pausen bestimmen den Urlaubsverbrauch; ein kurzer oder teilweise abwesender Tag wird deshalb nur mit seinen fehlenden Stunden belastet.

## Projektstatus

`Project.status` behält die allgemeinen Werte `active`, `inactive` und den Archivzustand. Der interne Management-Status ist ein separater Datensatz. Dadurch kann ein aktives Projekt beispielsweise gleichzeitig im Management-Status „Fertigung“ stehen, ohne dass Projektberechtigungen oder Archivierung verändert werden.

## Kalkulationsprinzip

Allgemeine Jahreskosten umfassen Raum/Energie, Verwaltung/Vertrieb, Versicherungen, Fahrzeuge, Abschreibungen, Finanzierung sowie kalkulatorischen Unternehmerlohn, kalkulatorische Zinsen und Wagnis. Sie werden nach produktiven Stunden auf Tätigkeiten verteilt.

Je Tätigkeit werden produktive Jahresstunden, Personalkosten inklusive Arbeitgeberanteilen, sonstige direkte Kosten, Maschinenjahreskosten, Maschinenstunden und der typische Maschinen-Nutzungsanteil erfasst. Daraus entstehen:

- Basisstundensatz = Personal + direkte Kosten + Gemeinkostenanteil, geteilt durch produktive Stunden
- Maschinenstundensatz = Maschinenjahreskosten, geteilt durch Maschinenstunden
- Selbstkostensatz = Basisstundensatz + anteiliger Maschinenstundensatz
- Verkaufssatz = Selbstkostensatz plus Gewinn-/Sicherheitsaufschlag
