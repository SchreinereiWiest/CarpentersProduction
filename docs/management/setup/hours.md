# 04 · Mitarbeiter und Arbeitsstunden

Dieser Bereich verbindet die Personalkapazität mit den vorhandenen Tätigkeiten und Kalenderberichten. Manuelle Planung und tatsächlich gespeicherte Arbeitszeit bleiben getrennt.

## Tätigkeiten bündeln

Die Tätigkeiten kommen aus den Firmeneinstellungen. Frei benannte Tätigkeiten vorhandener Berichte werden ergänzt. Jede Tätigkeit kann genau einer Kostenstelle zugeordnet werden. Bereits anderswo vergebene Tätigkeiten sind für eine weitere Zuordnung gesperrt.

Zuschnitt und Bekantung können gemeinsam den Standardmaschinenbereich bilden. Die spätere Stundenanalyse zeigt trotzdem beide Tätigkeiten einzeln und zusätzlich die gemeinsame Kostenstellensumme. Ohne Zuordnung bleiben Stunden sichtbar und werden nicht stillschweigend in einen anderen Bereich verschoben.

## Personal und Kapazität

Aktive Personalkonten können gemeinsam übernommen werden. Manuelle Mitarbeiter ohne Konto sind ebenfalls möglich. Konto-IDs verbinden die Planungsposition mit dem vorhandenen Personal; ein Konto darf nur einmal in derselben Jahresplanung vorkommen.

| Eingabe | Bedeutung |
| --- | --- |
| Jahrespersonalkosten | Kosten dieses Mitarbeiters inklusive Arbeitgeberanteilen |
| Vollzeitäquivalent | Teilzeitanteil für die abgeleitete Kapazität |
| Produktive Jahresstunden | Direkte Vorgabe; leer aktiviert die Kapazitätsformel |
| Arbeitstage | Werktage des gewählten Geschäftsjahrs; automatisch ermittelt |
| Feiertage, Urlaub, Krankheit, Schulung | Überprüfbare Ausfallannahmen |
| Tagesstunden | Netto-Arbeitszeit aus Firmeneinstellungen und Pausen |
| Produktiver Anteil | Anteil der verfügbaren Zeit, der als produktiv geplant wird |

`Produktive Stunden = (Arbeitstage − Ausfalltage) × Tagesstunden × Vollzeitäquivalent × produktiver Anteil`.

Die vorgeschlagenen Ausfalltage und die Produktivität sind Startwerte, keine automatisch erkannten Mitarbeiterdaten. Ein direkt eingetragener Jahreswert ersetzt die Formel vollständig.

## Zeitanteile je Bereich

Jeder Mitarbeiter verteilt seine produktiven Stunden auf Kostenstellen. Beispiel: 1.000 Stunden × 60 % Bankraum, 25 % Maschinenraum und 15 % Montage ergeben 600, 250 und 150 Stunden. Die Summe der Anteile muss vor der Vollkostenfreigabe 100 % sein. Verwaltung kann als eigener Hilfsbereich erfasst werden.

## Erfasste Stunden als Basis

Standard ist die manuelle Jahresplanung. Alternativ können vorhandene Zeitberichte zur Kalkulationsbasis werden. Dabei erfolgt **keine Hochrechnung**: Für einen Jahresstundensatz muss der Berichtszeitraum ein vollständiges Jahr abdecken. Ohne Berichte bleibt die manuelle Basis aktiv.

Abgeschlossene `TimeEntry`-Datensätze mit positivem Minutenwert werden ausgewertet. Laufende, zukünftige und fremde Perioden werden ausgelassen. Die Periodenzuordnung folgt dem Berliner Kalendertag des Arbeitsbeginns. Zusätzliche JSON-Wochendateien des Kalenders werden nicht nochmals gezählt.

## Beziehungen im Code

`setup/steps/hours.management.jsx` verwendet die Firmenkonfiguration und die Defaultfabrik `newStaff`. `calculation/hours.mjs` berechnet Planstunden sowie Mitarbeiter-, Tätigkeits- und Monatssummen. Eine Freigabe fixiert die gewählte Kalkulationsbasis; die [Jahresanalyse](../operating/hours.md) berücksichtigt nach Aktualisierung neue Berichte.

Weiter: [Kostenstellenverteilung](distribution.md).
