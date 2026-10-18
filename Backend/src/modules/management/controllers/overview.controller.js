import prisma, { systemPrisma } from '../../../infrastructure/database/prisma.js';
import { requestYear } from '../services/http.js';
import { loadSnapshot, presentSnapshot } from '../services/snapshots.js';

/** Liest aktive Personalkonten und Betriebsdokumente für die Managementansichten. */
async function loadManagementReferences(req) {
  const [files, memberships] = await Promise.all([
    prisma.file.findMany({
      where: { deletedAt: null, category: 'management-document' },
      select: { id: true, fileName: true, category: true }, orderBy: { uploadedAt: 'desc' },
    }),
    systemPrisma.tenantMembership.findMany({
      where: { tenantId: req.tenant.id, isActive: true, user: { deletedAt: null, isActive: true } },
      include: { user: { select: { id: true, firstName: true, lastName: true, login: true } } },
      orderBy: { user: { firstName: 'asc' } }
    }),
  ]);
  return { files, employees: memberships.map(item => item.user) };
}

/** Liefert Jahresdaten, Berechnungen und Referenzen in einer konsistenten Managementantwort. */
export async function getManagementOverview(req, res) {
  const [snapshot, references] = await Promise.all([
    loadSnapshot(requestYear(req)),
    loadManagementReferences(req)
  ]);
  res.json({ ...presentSnapshot(snapshot), references });
}

/** Behält den bisherigen Referenzendpunkt für ältere Clients bei. */
export async function getManagementReferences(req, res) {
  res.json(await loadManagementReferences(req));
}
