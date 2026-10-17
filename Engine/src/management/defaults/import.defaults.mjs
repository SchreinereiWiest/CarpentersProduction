export const IMPORT_TEMPLATE =
  "bereich;position;wert;kostenart;kostenstelle;anschaffungsdatum;nutzungsdauer;restwert;zinssatz;istwert;wartung;wiederbeschaffungswert;vergangene_jahre;kennung\r\n";

export const IMPORT_LIMITS = { bytes: 2000000, rows: 1500 };
export const IMPORT_ASSET_CATEGORIES = { maschine: 'machine', cnc: 'cnc', fahrzeug: 'vehicle', gebäude: 'building', ausstattung: 'equipment', anlage: 'equipment' };
export const IMPORT_BALANCE_FIELDS = { bankguthaben: 'openingCash', bank: 'openingCash', kasse: 'openingCash', 'weitere vermögenswerte': 'openingOtherAssets', 'weitere verbindlichkeiten': 'openingOtherLiabilities' };
