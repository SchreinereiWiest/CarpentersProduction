import "dotenv/config";

import app from "./app.js";
import { startStorageDeletionWorker } from "./infrastructure/storage/storage-deletion.service.js";
import { startPaperlessSyncWorker } from "./modules/paperless/paperless-sync.service.js";
import { ensureDevelopmentTenant } from "./modules/tenants/tenant-bootstrap.service.js";
import { startContactHistoryScheduler } from "./modules/contact-history/contact-history-queue.service.js";

const port = Number(process.env.PORT) || 5000;

ensureDevelopmentTenant()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
      startStorageDeletionWorker();
      startPaperlessSyncWorker();
      startContactHistoryScheduler();
    });
  })
  .catch(error => {
    console.error("Tenant initialization failed:", error);
    process.exitCode = 1;
  });
