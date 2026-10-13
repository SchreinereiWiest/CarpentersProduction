import prisma, { systemPrisma } from '../../config/prisma.js';
import { requestYear } from '../../services/management/http.js';
import { loadSnapshot, presentSnapshot } from '../../services/management/snapshots.js';

/** Liefert die Jahresdaten und Berechnungen für Einrichtung, Jahresbetrieb und Vorjahresvergleich. */
export async function getManagementOverview(req, res) {
  res.json(presentSnapshot(await loadSnapshot(requestYear(req))));
}

/** Liefert aktive Personalkonten und Betriebsdokumente, die die aktuellen Managementansichten verwenden. */
export async function getManagementReferences(req, res) {
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
  res.json({ files, employees: memberships.map(item => item.user) });
}
