import prisma from '../../config/prisma.js';
import { WRITE_OPTIONS } from './defaults/persistence.defaults.js';

/** Speichert Änderung und Auditnachweis atomar; parallele Konflikte werden nicht überschrieben. */
export function write(req, action, operation) {
  return prisma.$transaction(
    /** Führt Änderung und Auditnachweis innerhalb derselben serialisierbaren Transaktion aus. */
    async function persistAndAudit(db) {
      const result = await operation(db);
      await db.auditLog.create({ data: {
        actorUserId: req.user.id, action: `management.${action}`,
        entityType: 'Management', entityId: result?.id || null,
      } });
      return result;
    }, WRITE_OPTIONS);
}
