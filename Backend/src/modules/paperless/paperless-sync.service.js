import prisma, { systemPrisma } from "../../infrastructure/database/prisma.js";
import { runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { enqueuePaperlessQrInspection } from "./paperless-qr.service.js";
import {
  getPaperlessConfiguration,
  loadPaperlessTaxonomies,
  normalizeRemoteDocument,
  paperlessJson,
  persistNormalizedPaperlessDocument
} from "./paperless.service.js";

const PAGE_SIZE = 100;
const MAX_PAGES_PER_RUN = 20;

async function markQueueFailure(document, error) {
  await prisma.paperlessDocument.update({
    where: { id: document.id },
    data: {
      status: "inbox",
      qrStatus: "failed",
      qrError: String(error?.message || error).slice(0, 2000)
    }
  });
}

async function initializeCursor(configuration) {
  const latestLocal = await prisma.paperlessDocument.findFirst({
    orderBy: { remoteDocumentId: "desc" },
    select: { remoteDocumentId: true }
  });
  if (latestLocal) return latestLocal.remoteDocumentId;

  // Beim erstmaligen Aktivieren bleibt die bestehende Paperless-Bibliothek
  // ausschließlich durchsuchbar. Der Eingang beginnt mit Dokumenten, die nach
  // diesem Initialstand hinzukommen.
  const { data } = await paperlessJson("documents/?page_size=1&ordering=-id");
  const latestRemote = Number(data.results?.[0]?.id) || 0;
  await prisma.paperlessConfiguration.update({
    where: { id: configuration.id },
    data: {
      lastRemoteDocumentId: latestRemote || null,
      lastSyncAt: new Date(),
      lastSyncError: null
    }
  });
  return latestRemote;
}

export async function syncPaperlessDocuments() {
  const configuration = await getPaperlessConfiguration({ required: false });
  if (!configuration?.enabled) return { imported: 0, skipped: true };

  try {
    const cursor = configuration.lastRemoteDocumentId ?? await initializeCursor(configuration);
    const remoteDocuments = new Map();
    let page = 1;
    let newestRemoteId = cursor || 0;

    while (page <= MAX_PAGES_PER_RUN) {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        ordering: "-id"
      });
      const { data } = await paperlessJson(`documents/?${params}`);
      const results = Array.isArray(data.results) ? data.results : [];
      if (!results.length) break;

      let reachedCursor = false;
      for (const remote of results) {
        const remoteId = Number(remote.id);
        if (!Number.isSafeInteger(remoteId)) continue;
        newestRemoteId = Math.max(newestRemoteId, remoteId);
        if (remoteId <= cursor) {
          reachedCursor = true;
          continue;
        }
        remoteDocuments.set(remoteId, remote);
      }
      if (reachedCursor || !data.next) break;
      page += 1;
    }

    const names = remoteDocuments.size ? await loadPaperlessTaxonomies() : {};
    let imported = 0;
    for (const remote of [...remoteDocuments.values()].sort((left, right) => Number(left.id) - Number(right.id))) {
      const normalized = normalizeRemoteDocument(remote, names);
      const { document, created } = await persistNormalizedPaperlessDocument(normalized, { configuration });
      if (!created) continue;
      imported += 1;
      try {
        await enqueuePaperlessQrInspection(document);
      } catch (error) {
        await markQueueFailure(document, error);
      }
    }

    await prisma.paperlessConfiguration.update({
      where: { id: configuration.id },
      data: {
        lastRemoteDocumentId: newestRemoteId || configuration.lastRemoteDocumentId,
        lastSyncAt: new Date(),
        lastSyncError: null
      }
    });
    return { imported, cursor: newestRemoteId };
  } catch (error) {
    await prisma.paperlessConfiguration.update({
      where: { id: configuration.id },
      data: { lastSyncAt: new Date(), lastSyncError: String(error?.message || error).slice(0, 1000) }
    }).catch(() => {});
    throw error;
  }
}

async function syncAllTenants() {
  const tenants = await systemPrisma.tenant.findMany({
    where: { status: "active" },
    select: { id: true }
  });
  for (const tenant of tenants) {
    await runWithTenant(
      { tenantId: tenant.id, userId: "paperless-sync-worker" },
      () => syncPaperlessDocuments().catch(error => {
        console.error(`Paperless sync failed for tenant ${tenant.id}:`, error.message);
      })
    );
  }
}

export function startPaperlessSyncWorker() {
  const configured = Number(process.env.PAPERLESS_SYNC_INTERVAL_MS);
  const intervalMs = Number.isFinite(configured)
    ? Math.max(15_000, Math.min(3_600_000, configured))
    : 60_000;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await syncAllTenants();
    } finally {
      running = false;
    }
  };
  const initialRun = setTimeout(run, 2_000);
  const interval = setInterval(run, intervalMs);
  initialRun.unref();
  interval.unref();
}
