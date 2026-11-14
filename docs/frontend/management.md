# Management

Die Managementansicht ist keine Buchungs- oder Finanzverwaltung. Sie bündelt fünf operative Arbeitsbereiche:

| Reiter | Zweck |
| --- | --- |
| Mitarbeiterauslastung | Aufträge zuweisen sowie produktive Stunden, Kapazität, Urlaub und Gehalt je Mitarbeiter auswerten |
| Projektstatus | Projekte unabhängig von `active`, `inactive` und Archiv durch konfigurierbare Management-Status bewegen |
| Projektzeitraum | Projekte in einem Tages-Gantt mit frei benennbaren Arbeitsschritten und verschiebbaren Zeitbalken planen |
| Jahresziele | Sollwerte mit Stichtag, beliebig viele Zwischenstände und abschließenden Istwert vergleichen |
| Stundensätze | Vollkosten- und Maschinenstundensätze für alle Unternehmenstätigkeiten berechnen |

Statusspalten und Zieltypen werden unter **Firmeneinstellungen → Advanced → Management** gepflegt. Tätigkeiten beziehungsweise Kostenstellen und die Arbeitswoche stammen aus **Advanced → Unternehmen**. Jeder Wochentag besitzt eigene Arbeits- und Pausenzeiten. Beim Speichern werden wiederkehrende freie Tage des gewählten Jahres automatisch als firmenweite, ganztägige Termine „Betriebsfrei“ in den Kalender synchronisiert. Sie steuern damit sowohl die Personalstunden als auch die sichtbare Kalenderplanung. Einmalige Betriebstage werden direkt im Kalender angelegt.

Die Stundensatzrechnung verteilt allgemeine und kalkulatorische Unternehmenskosten nach produktiven Stunden. „Daten abgreifen“ summiert dafür die produktiven Zeitbuchungen je Mitarbeiter und Kostenstelle, verteilt das hinterlegte Jahresgehalt jedes Mitarbeiters nach seinem Stundenanteil und zeigt daraus zugleich den Gemeinkostenschlüssel der Kostenstelle. Manuell zu ergänzen bleiben sonstige direkte Kosten, Maschinenkosten, Maschinenstunden und der Maschinenanteil. Gespeicherte Selbstkostensätze werden im Kalkulationskontext der Projekte automatisch als Kostenstellen bereitgestellt.

Die allgemeine Projektlebenszyklus-Einstellung bleibt in den Projekteinstellungen. Das Management-Board speichert nur einen zusätzlichen internen Ablaufstatus.

Eine Mitarbeiterzuweisung erscheint zugleich als hervorgehobene Notification und als Auftrag im persönlichen Startseitenmodul des zugewiesenen Accounts. Die Zuweisungsinfo und ein verknüpfter Kalenderzeitraum werden dort mit angezeigt.

„Projektzeitraum im Kalender“ öffnet die vorhandene Monatsansicht. Der erste Klick setzt den Start und markiert die Vorschau bis zum Roadmap-Ende; der zweite Klick legt das tatsächliche Ende fest und speichert den Produktionstermin.

Der Reiter Projektzeitraum startet mit einer automatisch erzeugten Gesamtübersicht aller vorhandenen Projekt-Gantts. Projekte, Arbeitsschritte und Balken werden chronologisch sortiert; zeitliche Überschneidungen eines Arbeitsschritts erscheinen auf getrennten Spuren. Alle Tageskacheln einschließlich Montag verwenden dieselbe Rasterlinie. Eine Planungsdichte zeigt pro Tag die Anzahl paralleler Projekte und Arbeitspakete. Sie beschreibt die betriebliche Parallelität, während personenbezogene Kapazität weiterhin über die Mitarbeiterzuweisung ausgewertet wird.

Im Einzelprojekt-Editor setzt der erste Tagesklick den Balkenstart und der zweite das Ende. Bestehende Balken lassen sich per Drag-and-drop verschieben; ein Doppelklick ändert ihre Dauer. Der früheste Balkenstart und das späteste Balkenende ergeben automatisch den Projektzeitraum. Dieser Gesamtzeitraum kann mit einem Kalendertyp als verknüpfter Eintrag in den vorhandenen Kalender übertragen und bei späteren Planänderungen aktualisiert werden.
