const value = input => String(input ?? "").trim();

export function createPartCodePayload({ projectId, pid, instanceId, scanBaseUrl, baseUrl }) {
  const project = value(projectId);
  const part = value(pid);
  if (!project || !part) throw new Error("Eticket benötigt projectId und PID.");

  const webBase = value(scanBaseUrl ?? baseUrl);
  if (webBase) {
    try {
      const origin = new URL(webBase);
      if (["http:", "https:"].includes(origin.protocol)) {
        const target = new URL(`/Projects/Cnc/${encodeURIComponent(project)}`, origin.origin);
        target.searchParams.set("pid", part);
        if (value(instanceId)) target.searchParams.set("instance", value(instanceId));
        return target.toString();
      }
    } catch {
      // Ungültige oder nicht-webfähige Basis fällt auf das Scanner-Protokoll zurück.
    }
  }

  const query = new URLSearchParams({ project, pid: part });
  if (value(instanceId)) query.set("instance", value(instanceId));
  return `carpenters://part/v1?${query.toString()}`;
}

export function parsePartCodePayload(payload) {
  const parsed = new URL(value(payload));
  const nativeCode = parsed.protocol === "carpenters:" && parsed.hostname === "part" && parsed.pathname === "/v1";
  const webMatch = ["http:", "https:"].includes(parsed.protocol)
    ? parsed.pathname.match(/^\/Projects\/Cnc\/([^/]+)\/?$/i)
    : null;
  if (!nativeCode && !webMatch) throw new Error("Unbekanntes Eticket-Codeformat.");
  const projectId = nativeCode
    ? value(parsed.searchParams.get("project"))
    : decodeURIComponent(webMatch[1]);
  const pid = value(parsed.searchParams.get("pid"));
  if (!projectId || !pid) throw new Error("Eticket-Code enthält keine Projekt- oder PID-Information.");
  return {
    version: 1,
    projectId,
    pid,
    instanceId: value(parsed.searchParams.get("instance")) || null
  };
}

export function normalizeEticketData(value = {}) {
  const short = (input, max = 100) => String(input ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  const data = {
    projectId: short(value.projectId, 100),
    pid: short(value.pid, 100),
    instanceId: short(value.instanceId, 100),
    project: short(value.project, 100),
    customer: short(value.customer, 100),
    partName: short(value.partName, 100),
    cabinet: short(value.cabinet, 100),
    dimensions: short(value.dimensions, 80),
    material: short(value.material, 100),
    edges: short(value.edges, 140),
    cncProgram: short(value.cncProgram, 100),
    scanBaseUrl: short(value.scanBaseUrl, 300),
    productionPath: value.productionPath === "1d" ? "1d" : "2d"
  };
  data.code = createPartCodePayload(data);
  return data;
}

const LABELS = {
  pid: "PID",
  project: "Projekt",
  customer: "Kunde",
  partName: "Bauteil",
  cabinet: "Korpus",
  dimensions: "Maße",
  material: "Material",
  edges: "Kanten",
  cncProgram: "CNC",
  instance: "Instanz"
};

export function getEticketInformationRows(data, settings) {
  return settings.fieldOrder.flatMap(key => {
    if (!settings.information[key]) return [];
    const dataKey = key === "instance" ? "instanceId" : key;
    const content = String(data[dataKey] ?? "").trim();
    return content ? [{ key, label: LABELS[key], value: content }] : [];
  });
}
