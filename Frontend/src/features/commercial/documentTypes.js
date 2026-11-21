export const COMMERCIAL_DOCUMENT_TYPES = [
  { value: "quote", label: "Angebot", prefix: "ANG" },
  { value: "invoice", label: "Rechnung", prefix: "RE" },
  { value: "order_confirmation", label: "Auftragsbestätigung", prefix: "AB" },
  { value: "partial_invoice", label: "Abschlagsrechnung", prefix: "AZ" }
];

export const commercialDocumentLabel = type => COMMERCIAL_DOCUMENT_TYPES.find(entry => entry.value === type)?.label || "Angebot";
