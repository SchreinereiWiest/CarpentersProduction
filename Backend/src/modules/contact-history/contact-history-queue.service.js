import prisma, { systemPrisma } from "../../infrastructure/database/prisma.js";
import { runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { pushUniqueValkeyJob } from "../../infrastructure/queue/valkey.js";
import {
  CONTACT_HISTORY_QUEUE,
  contactHistoryDedupeKey
} from "./contact-history.service.js";

export async function enqueueContactHistorySync(tenantId) {
  return pushUniqueValkeyJob(CONTACT_HISTORY_QUEUE, { tenantId }, {
    dedupeKey: contactHistoryDedupeKey(tenantId),
    ttlSeconds: 15 * 60
  });
}

const retryDelayMinutes = configuration => Math.min(
  60,
  configuration.syncIntervalMinutes * (2 ** Math.min(configuration.consecutiveFailures, 4))
);

async function enqueueTenantIfDue(tenantId) {
  return runWithTenant({ tenantId, userId: "contact-history-scheduler" }, async () => {
    const configuration = await prisma.contactHistoryConfiguration.findFirst({
      select: {
        enabled: true,
        lastSyncAt: true,
        syncIntervalMinutes: true,
        consecutiveFailures: true
      }
    });
    if (!configuration?.enabled) return false;
    const delayMs = retryDelayMinutes(configuration) * 60 * 1_000;
    if (configuration.lastSyncAt && Date.now() - configuration.lastSyncAt.getTime() < delayMs) return false;
    return enqueueContactHistorySync(tenantId);
  });
}

async function enqueueDueTenants() {
  const tenants = await systemPrisma.tenant.findMany({
    where: { status: "active" },
    select: { id: true }
  });
  for (const tenant of tenants) {
    await enqueueTenantIfDue(tenant.id).catch(error => {
      console.error(`Contact history enqueue failed for tenant ${tenant.id}:`, error.message);
    });
  }
}

export function startContactHistoryScheduler() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await enqueueDueTenants();
    } finally {
      running = false;
    }
  };
  const initialRun = setTimeout(run, 3_000);
  const interval = setInterval(run, 60_000);
  initialRun.unref();
  interval.unref();
}
