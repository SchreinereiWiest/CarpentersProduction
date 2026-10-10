# Risiken und Qualitätsregeln

Diese Seite dokumentiert den derzeitigen Frontend-Iststand. Backend-Autorisierung bleibt unabhängig davon verbindlich.

## Bekannte Risiken und Inkonsistenzen

| Befund | Auswirkung | Empfehlung |
|---|---|---|
| Rollenprüfung kennt nur exakte Rolle oder `admin` | `manager` erreicht Routen mit `requiredRole="user"` nicht, obwohl das Backend Managerrechte kennt | gemeinsame Rollenmatrix definieren und Guard darüber auswerten |
| Guard-Ausdruck mischt `&&` und `||` ohne Klammern | schwer prüfbare Rollenlogik und hohes Regressionsrisiko | benannte Funktion `hasRequiredRole(user,requiredRole)` mit Tests |
| kein Logout-UI | Session kann nicht regulär über `/api/auth/logout` widerrufen werden | Logout-Aktion mit CSRF-geschütztem Request ergänzen |
| mehrere Projektseiten laden `/api/customers/get/:id` | normale Projektbenutzer erhalten nach Backend-Härtung `403` | benötigte reduzierte Kundendaten aus Projektantwort verwenden oder eigene berechtigte API anbieten |
| Projekt-Zeitsteuerung lädt `/api/auth/users` | normale Benutzer erhalten nach Rollenbeschränkung `403` | Benutzerwahl nur Admin/Manager anzeigen; Standardbenutzer immer auf eigene ID setzen |
| Memory Cache nicht invalidierbar | IndexedDB-Invalidierung kann im laufenden Tab durch alte Map-Werte überstimmt werden | Memory-Invalidierung zusammen mit IndexedDB exportieren |
| Uploads ohne explizite Clientlimits | große Dateien werden erst serverseitig begrenzt; normale Uploads liegen im Backend-RAM | Dateigröße und MIME-Typ vor Upload prüfen |
| keine Error Boundary | Renderfehler können eine komplette Seite leeren | globale und modulbezogene Error Boundaries ergänzen |
| wenig automatisierte Frontendtests | Geometrie-, Rollen- und Kalenderregressionen bleiben spät sichtbar | Vitest/Testing Library sowie deterministische Engine-Tests einführen |
| viele `console.log` in Produktpfaden | potenziell sensible Fach- und Benutzerdaten in Browserlogs | strukturierten, umgebungsabhängigen Logger verwenden |

## Regeln für neue Komponenten

- API-Autorisierung niemals aus sichtbaren Buttons oder Route Guards ableiten.
- Serverseitige Daten mit explizitem Loading-, Empty- und Error-State rendern.
- Mutierende Axios-Requests relativ unter `/api` halten, damit Session- und CSRF-Cookies gleichursprünglich funktionieren.
- Editor-State nicht in-place verändern; Arrays/Bäume kopieren oder reine Transformationsfunktionen verwenden.
- IDs aus `useParams` als nicht vertrauenswürdig behandeln und Backendfehler sichtbar abfangen.
- Große Enginefunktionen mit kleinen deterministischen Fixtures testen; Zufall nur über expliziten Seed.
- Cacheeinträge nach Mutation auf Memory- und IndexedDB-Ebene gemeinsam aktualisieren oder invalidieren.

## Empfohlene Testschichten

1. Reine Unit-Tests für Nesting-, Geometrie-, Sektions- und CNC-Funktionen.
2. Hook-Tests für Auth, Settings und Mitarbeiterkalender.
3. Komponententests für Rollenanzeige, Formulare und Fehlerzustände.
4. API-Vertragstests gegen die dokumentierten Backendantworten.
5. End-to-End-Tests für Login, Projektanlage, Speichern, Nesting, Zeitbuchung und Logout.

