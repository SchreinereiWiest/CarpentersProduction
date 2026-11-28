import { GetObjectCommand } from "@aws-sdk/client-s3";

import { createEticketPrintJob, normalizeEticketSettings } from "../../../../Engine/src/eticket/index.js";
import prisma from "../../infrastructure/database/prisma.js";
import { s3Upload } from "../../infrastructure/storage/s3.js";
import { sendRawPrintJob } from "./eticket.transport.js";

const serviceError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

export async function loadEticketSettings() {
  const file = await prisma.file.findFirst({
    where: { fileName: "settings-cnc.json", deletedAt: null },
    include: { storageObject: true }
  });
  if (!file?.storageObject?.objectKey) return normalizeEticketSettings();

  const response = await s3Upload.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: file.storageObject.objectKey
  }));
  const text = await response.Body.transformToString("utf-8");
  const settings = JSON.parse(text);
  return normalizeEticketSettings(settings.eticket);
}

export async function printEticket(ticketData, { connect } = {}) {
  const settings = await loadEticketSettings();
  if (!settings.enabled) {
    throw serviceError("Das Etikettensystem ist in den CNC-Firmeneinstellungen deaktiviert.", 409, "ETICKET_DISABLED");
  }
  if (!settings.printer.host) {
    throw serviceError("In den CNC-Firmeneinstellungen ist kein Etikettendrucker hinterlegt.", 409, "ETICKET_PRINTER_NOT_CONFIGURED");
  }

  let job;
  try {
    job = createEticketPrintJob(ticketData, settings);
  } catch (error) {
    throw serviceError(error.message, 400, "ETICKET_DATA_INVALID");
  }
  await sendRawPrintJob({
    host: settings.printer.host,
    port: settings.printer.port,
    timeoutMs: settings.printer.timeoutMs,
    content: job.content
  }, connect);
  return {
    accepted: true,
    language: job.language,
    copies: job.copies,
    code: job.data.code,
    pid: job.data.pid,
    instanceId: job.data.instanceId || null
  };
}
