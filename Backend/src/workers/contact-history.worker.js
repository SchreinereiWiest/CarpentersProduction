import "dotenv/config";

import {
  acknowledgeValkeyJob,
  claimValkeyJob,
  recoverValkeyJobs
} from "../infrastructure/queue/valkey.js";
import { runWithTenant } from "../infrastructure/database/tenant-context.js";
import { syncContactHistory } from "../modules/contact-history/contact-history-imap.service.js";
import {
  CONTACT_HISTORY_PROCESSING_QUEUE,
  CONTACT_HISTORY_QUEUE,
  contactHistoryDedupeKey
} from "../modules/contact-history/contact-history.service.js";

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => { stopping = true; });
}

async function processClaim(raw) {
  let tenantId = null;
  let dedupeKey = null;
  try {
    const payload = JSON.parse(raw);
    tenantId = payload?.tenantId;
    dedupeKey = contactHistoryDedupeKey(tenantId);
    const result = await runWithTenant(
      { tenantId, userId: "contact-history-worker" },
      () => syncContactHistory()
    );
    console.info(`Contact history sync completed for tenant ${tenantId}:`, result);
  } catch (error) {
    console.error(`Contact history worker job failed${tenantId ? ` for tenant ${tenantId}` : ""}:`, error.message);
  } finally {
    await acknowledgeValkeyJob(CONTACT_HISTORY_PROCESSING_QUEUE, raw, {
      dedupeKey
    }).catch(error => console.error("Contact history job acknowledgement failed:", error.message));
  }
}

async function main() {
  await recoverValkeyJobs(CONTACT_HISTORY_QUEUE, CONTACT_HISTORY_PROCESSING_QUEUE);
  while (!stopping) {
    try {
      const raw = await claimValkeyJob(CONTACT_HISTORY_QUEUE, CONTACT_HISTORY_PROCESSING_QUEUE, { timeoutSeconds: 30 });
      if (raw) await processClaim(raw);
    } catch (error) {
      console.error("Contact history worker queue error:", error.message);
      await new Promise(resolve => setTimeout(resolve, 5_000));
    }
  }
}

main().catch(error => {
  console.error("Contact history worker stopped:", error);
  process.exitCode = 1;
});
