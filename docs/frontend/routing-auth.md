# Routing und Authentifizierung

## Provider-Reihenfolge

`src/main.jsx` rendert die Anwendung in dieser Reihenfolge:

1. `React.StrictMode`
2. `AppProvider`
3. `AuthProvider`
4. `BrowserRouter`
5. `Routes`

`AppProvider` hält `projectRoute` sowie den Zustand `SideBarCollapsed`. `AuthProvider` lädt beim ersten Rendern `/api/auth/me` und stellt `user`, `setUser`, `loading` und `checkAuth` bereit.

## Route Guards

| Guard | Verhalten |
|---|---|
| `ProtectedRoute` | zeigt während der Prüfung eine leere Ladefläche; leitet ohne Session nach `/login`, bei falscher Rolle nach `/` |
| `ProtectedElement` | gleiche Rollenprüfung für einzelne UI-Elemente; rendert bei fehlender Rolle nichts |
| `PublicRoute` | leitet bereits angemeldete Benutzer von öffentlichen Seiten nach `/` |

Die Guards dienen der Benutzerführung. Die verbindliche Autorisierung findet immer im Backend statt.

Die Rollenstufen der Guards sind:

- `user`: `user`, `manager` und `admin`,
- `admin`: `manager` und `admin`,
- `adminOnly`: ausschließlich `admin`.

`adminOnly` wird für die gesamte Route `/CompanySettings` und deren
Navigation verwendet.

## Routen

| Pfad | Seite | Frontend-Rolle |
|---|---|---|
| `/login` | Login | öffentlich, nur ohne Session |
| `/` | Startseite | angemeldet |
| `/Projects` | Projektübersicht | angemeldet |
| `/Projects/:projectId` | Projekthome | angemeldet |
| `/Projects/CAD/:projectId` | CAD-Ansicht | angemeldet |
| `/Projects/Cabinet/:projectId` | Korpus-Editor | angemeldet |
| `/Projects/List/:projectId` | Stückliste | angemeldet |
| `/Projects/Nesting/:projectId` | Nesting | angemeldet |
| `/Projects/Cut/:projectId` | Zuschnitt | angemeldet |
| `/Projects/Cnc/:projectId` | CNC-Editor | angemeldet |
| `/Projects/Time/:projectId` | Projektzeiten | angemeldet |
| `/Projects/Settings/:projectId` | Projekteinstellungen | angemeldet |
| `/Projects/Create` | neuer Korpus/Projektfluss | angemeldet |
| `/Projects/Create/List` | älterer Projekteditor | angemeldet |
| `/Projects/Create/:id` | älterer Editor mit ID | angemeldet |
| `/Storage` | Lager | angemeldet |
| `/Mitarbeiter` | persönlicher Kalender | angemeldet |
| `/Kontakte` | Kundenliste | Admin oder Manager |
| `/Kontakte/new` | Kunde anlegen | Admin oder Manager |
| `/Kontakte/info/:userid` | Kundendetails | Admin oder Manager |
| `/Kontakte/edit/:userid` | Kunde bearbeiten | Admin oder Manager |
| `/Kontakte/NewProject/:userId` | Projekt für Kunden anlegen | Admin oder Manager |
| `/CompanySettings` | Administration | ausschließlich Admin |

## Login und CSRF

`Login` sendet Login und Passwort an `POST /api/auth/login`, ruft danach `checkAuth()` auf und navigiert zu `/`. Das JWT bleibt als HTTP-only-Cookie für JavaScript unsichtbar.

Das Backend setzt außerdem `XSRF-TOKEN`. Axios verwendet standardmäßig denselben Cookie-Namen und sendet ihn bei gleichursprünglichen mutierenden Requests als `X-XSRF-TOKEN`; relative `/api`-URLs sind deshalb wichtig. Direkte `fetch`-Mutationen müssten den Header ausdrücklich ergänzen.

## Sessionende

Das Frontend besitzt derzeit keinen Logout-Aufruf. Für einen vollständigen Logout muss `POST /api/auth/logout` mit CSRF-Header aufgerufen und anschließend `setUser(null)` ausgeführt werden.
