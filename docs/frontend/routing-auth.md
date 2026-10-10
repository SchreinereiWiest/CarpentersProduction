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

## Routen

| Pfad | Seite | Frontend-Rolle |
|---|---|---|
| `/login` | Login | öffentlich, nur ohne Session |
| `/` | Startseite | angemeldet |
| `/Projects` | Projektübersicht | `user` oder `admin` |
| `/Projects/:projectId` | Projekthome | `user` oder `admin` |
| `/Projects/CAD/:projectId` | CAD-Ansicht | `user` oder `admin` |
| `/Projects/Cabinet/:projectId` | Korpus-Editor | `user` oder `admin` |
| `/Projects/List/:projectId` | Stückliste | `user` oder `admin` |
| `/Projects/Nesting/:projectId` | Nesting | `user` oder `admin` |
| `/Projects/Cut/:projectId` | Zuschnitt | `user` oder `admin` |
| `/Projects/Cnc/:projectId` | CNC-Editor | `user` oder `admin` |
| `/Projects/Time/:projectId` | Projektzeiten | `user` oder `admin` |
| `/Projects/Settings/:projectId` | Projekteinstellungen | `user` oder `admin` |
| `/Projects/Create` | neuer Korpus/Projektfluss | `user` oder `admin` |
| `/Projects/Create/List` | älterer Projekteditor | `user` oder `admin` |
| `/Projects/Create/:id` | älterer Editor mit ID | `user` oder `admin` |
| `/Storage` | Lager | `user` oder `admin` |
| `/Mitarbeiter` | persönlicher Kalender | `user` oder `admin` |
| `/Kontakte` | Kundenliste | Admin |
| `/Kontakte/new` | Kunde anlegen | Admin |
| `/Kontakte/info/:userid` | Kundendetails | Admin |
| `/Kontakte/edit/:userid` | Kunde bearbeiten | Admin |
| `/Kontakte/NewProject/:userId` | Projekt für Kunden anlegen | Admin |
| `/CompanySettings` | Administration | Admin |

## Login und CSRF

`Login` sendet Login und Passwort an `POST /api/auth/login`, ruft danach `checkAuth()` auf und navigiert zu `/`. Das JWT bleibt als HTTP-only-Cookie für JavaScript unsichtbar.

Das Backend setzt außerdem `XSRF-TOKEN`. Axios verwendet standardmäßig denselben Cookie-Namen und sendet ihn bei gleichursprünglichen mutierenden Requests als `X-XSRF-TOKEN`; relative `/api`-URLs sind deshalb wichtig. Direkte `fetch`-Mutationen müssten den Header ausdrücklich ergänzen.

## Sessionende

Das Frontend besitzt derzeit keinen Logout-Aufruf. Für einen vollständigen Logout muss `POST /api/auth/logout` mit CSRF-Header aufgerufen und anschließend `setUser(null)` ausgeführt werden.

