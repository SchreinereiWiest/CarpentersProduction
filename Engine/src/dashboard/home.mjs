export const HOME_MODULES = Object.freeze([
  { id: "assignments", label: "Meine Aufträge", roles: ["user", "manager", "admin"] },
  { id: "appointments", label: "Termine dieser Woche", roles: ["user", "manager", "admin"] },
  { id: "week", label: "Kompakte Wochenübersicht", roles: ["user", "manager", "admin"] },
  { id: "managerDocuments", label: "Zu bearbeitende Dokumente", roles: ["manager"] },
  { id: "approvedPurchases", label: "Freigegebene Einkäufe", roles: ["admin"] },
  { id: "openDeliveries", label: "Offene Lieferungen", roles: ["admin"] },
  { id: "documentInbox", label: "Dokumenteingang", roles: ["admin"] }
]);

export const availableHomeModules = role => HOME_MODULES.filter(module => module.roles.includes(role));

export function normalizeHomePreferences(value, role = "user") {
  const allowed = availableHomeModules(role).map(module => module.id);
  const suppliedOrder = Array.isArray(value?.order) ? value.order : [];
  const order = [...new Set(suppliedOrder.filter(id => allowed.includes(id))), ...allowed.filter(id => !suppliedOrder.includes(id))];
  const hidden = [...new Set((Array.isArray(value?.hidden) ? value.hidden : []).filter(id => allowed.includes(id)))];
  return { order, hidden };
}
