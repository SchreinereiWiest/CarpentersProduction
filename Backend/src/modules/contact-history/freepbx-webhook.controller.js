import crypto from "node:crypto";

import prisma, { systemPrisma } from "../../infrastructure/database/prisma.js";
import { runWithTenant } from "../../infrastructure/database/tenant-context.js";
import { getTenantSecret } from "../attachment-search/tenant-secrets.service.js";
import { publishPhoneCall } from "./freepbx-call-events.service.js";
import {
  FREEPBX_WEBHOOK_SECRET,
  parseFreePbxWebhook,
  processPhoneCallEvent
} from "./freepbx.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const secretEqual = (expected, provided) => {
  if (!expected || !provided) return false;
  const left = Buffer.from(String(expected));
  const right = Buffer.from(String(provided));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export async function receiveFreePbxWebhook(req, res) {
  const tenantId = String(req.params.tenantId || "");
  if (!UUID.test(tenantId)) return res.status(400).json({ message: "Ungültiger FreePBX-Webhook." });
  const tenant = await systemPrisma.tenant.findFirst({
    where: { id: tenantId, status: "active" },
    select: { id: true }
  });
  if (!tenant) return res.status(404).json({ message: "Tenant not found" });

  return runWithTenant({ tenantId, userId: "freepbx-webhook" }, async () => {
    const configuration = await prisma.freePbxConfiguration.findFirst();
    const expectedSecret = await getTenantSecret(FREEPBX_WEBHOOK_SECRET);
    if (!configuration?.enabled || !secretEqual(expectedSecret, req.get("x-carpenters-freepbx-secret"))) {
      return res.status(401).json({ message: "Ungültiges Webhook-Secret." });
    }
    const payload = parseFreePbxWebhook(req.params.event, req.body, configuration.defaultCountryCode);
    const call = await processPhoneCallEvent(payload);
    await prisma.freePbxConfiguration.update({
      where: { id: configuration.id },
      data: { lastWebhookAt: new Date() }
    });
    publishPhoneCall(tenantId, call);
    return res.status(202).json({ accepted: true, callId: call.id, customerMatched: Boolean(call.customer) });
  });
}
