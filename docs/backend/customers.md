# Kunden

## Kunde anlegen

`POST /api/customers/new` ruft `newcustomer` auf und verlangt die Admin- oder Manager-Rolle. `firstName` und `lastName` müssen truthy sein; sonst folgt `400`. Zusammen mit dem Kunden wird immer genau eine Adresse verschachtelt angelegt.

Unterstützte Body-Felder:

| Kundendaten | Adressdaten |
|---|---|
| `firstName`, `lastName`, `companyName` | `street`, `houseNumber` |
| `email`, `phoneMobile`, `phoneLandline` | `postalCode`, `city`, `country` |
| `preferredContact`, `newsletterOptIn` | `floor`, `elevatorAvailable` |
| `customerStatus`, `customerRating` | `parkingInfo` |
| `source`, `notes` | |

Erfolg: `201` mit dem angelegten Kunden einschließlich `addresses`.

## Kundenliste

`GET /api/customers/all?page=N` ruft `getCustomers` auf. Die Seitengröße ist fest `20`; ohne oder bei nicht numerischem `page` wird Seite 1 verwendet. Sortierung: Nachname, dann Vorname aufsteigend.

```json
{
  "customers": [],
  "currentPage": 1,
  "totalPages": 0,
  "totalCustomers": 0
}
```

Adressen werden eingebettet. Ein Mindestwert für `page` wird nicht erzwungen.

## Einzelansicht

`GET /api/customers/get/:id` ruft `getCustomerInfo` auf und liefert `{ "customer": ... }` einschließlich Adressen. Eine unbekannte ID liefert aktuell `200` mit `customer: null`.

## Kunde aktualisieren

`POST /api/customers/update/:id` ruft `updateCustomer` auf. Es übernimmt dieselben Kundenfelder wie die Anlage und aktualisiert genau die über `body.addressId` bezeichnete Adresse mit den Adressfeldern. Erfolg: `200` mit Kunde und Adressen. Fehlende Datensätze und Validierungsprobleme werden pauschal als `500` behandelt.

## Suche

`GET /api/customers/search?search=TEXT` ruft `searchCustomers` auf und verlangt ein gültiges Login. Die Suche ist case-insensitive über `firstName`, `lastName` und `companyName`, ignoriert soft-gelöschte Kunden, sortiert nach Firma und Nachname und liefert maximal 15 Treffer.

Die Feldfreigabe ist rollenbasiert:

- `admin` und `manager` erhalten die vollständigen Kundendaten.
- `user` erhält nur `id`, `customerNumber`, Vorname, Nachname, Firma und Kundenstatus. Kontaktdaten, Bewertung, Quelle und Notizen werden nicht ausgegeben.

## Automatischer Kontaktverlauf per IMAP

Unter `Firmeneinstellungen → Advanced → Kontaktverlauf` kann ein Admin ein
IMAP-Postfach verbinden. Die Endpunkte liegen unter
`/api/contact-history` und benötigen die CRM-Lizenzfunktion sowie die
Admin-Rolle.

- `INBOX` und der automatisch über `\\Sent` beziehungsweise bekannte Namen
  erkannte Gesendet-Ordner werden über IMAPS/TLS auf Port 993 ausschließlich
  im Nur-Lese-Modus geöffnet. Beide Ordner besitzen einen getrennten
  UIDVALIDITY-/UID-Cursor.
- Absender-, Empfänger- und CC-Adressen werden normalisiert und mit der
  E-Mail-Adresse nicht gelöschter Kunden desselben Mandanten verglichen.
- Treffer werden als `Communication` mit `source = imap` dedupliziert und
  unveränderlich im CRM-Kontaktverlauf angezeigt.
- Nachrichten vom Kunden werden links, eigene Nachrichten an den Kunden rechts
  dargestellt. Der kompakte Verlauf scrollt innerhalb einer begrenzten Höhe;
  für große Historien steht ein durchscrollbares Vollbild-Modal zur Verfügung.
- Anhänge werden nur als Metadaten übernommen. Ist Paperless aktiv, erzeugt
  die Oberfläche eine Paperless-Suche nach dem Dateinamen; Binärdaten werden
  nicht doppelt im CRM gespeichert.
- Der Scheduler legt lediglich die Mandanten-ID in Valkey ab. Der separate
  `contact-history-worker` entschlüsselt das App-Passwort erst im
  Mandantenkontext und führt den Abruf aus.

Beim erstmaligen Abruf wird der konfigurierte Zeitraum (7 bis 365 Tage)
eingelesen. Danach begrenzen `UIDVALIDITY` und die letzte verarbeitete UID den
inkrementellen Abruf. Fehler führen zu einem exponentiell verlängerten
Wiederholungsintervall bis maximal 60 Minuten.
