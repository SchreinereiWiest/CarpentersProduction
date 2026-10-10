# Kunden

## Kunde anlegen

`POST /api/customers/new` ruft `newcustomer` auf und verlangt die Admin-Rolle. `firstName` und `lastName` müssen truthy sein; sonst folgt `400`. Zusammen mit dem Kunden wird immer genau eine Adresse verschachtelt angelegt.

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
