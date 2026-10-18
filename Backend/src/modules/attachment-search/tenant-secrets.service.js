import crypto from "node:crypto";

import prisma from "../../infrastructure/database/prisma.js";
import { getTenantId } from "../../infrastructure/database/tenant-context.js";

export const ATTACHMENT_SEARCH_API_KEY_SECRET = "attachment-search.openwebui-api-key";
const KEY_VERSION = 1;

function configurationError() {
    return Object.assign(
        new Error("AI_SECRET_ENCRYPTION_KEY ist nicht korrekt konfiguriert."),
        { statusCode: 503, code: "AI_SECRET_ENCRYPTION_UNAVAILABLE" }
    );
}

export function loadSecretEncryptionKey(raw = process.env.AI_SECRET_ENCRYPTION_KEY) {
    const value = String(raw || "").trim();
    let key;
    if (/^[a-f0-9]{64}$/i.test(value)) key = Buffer.from(value, "hex");
    else {
        try { key = Buffer.from(value, "base64"); } catch { throw configurationError(); }
    }
    if (key.length !== 32) throw configurationError();
    return key;
}

export function encryptTenantSecret(plaintext, { tenantId, name, key = loadSecretEncryptionKey() }) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(`${tenantId}:${name}:v${KEY_VERSION}`, "utf-8"));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    return {
        ciphertext: ciphertext.toString("base64"),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
        keyVersion: KEY_VERSION
    };
}

export function decryptTenantSecret(secret, { tenantId, name, key = loadSecretEncryptionKey() }) {
    if (secret.keyVersion !== KEY_VERSION) {
        throw Object.assign(new Error("Die Version des verschlüsselten AI-Secrets wird nicht unterstützt."), { statusCode: 503, code: "AI_SECRET_VERSION_UNSUPPORTED" });
    }
    try {
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
        decipher.setAAD(Buffer.from(`${tenantId}:${name}:v${secret.keyVersion}`, "utf-8"));
        decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
        return Buffer.concat([
            decipher.update(Buffer.from(secret.ciphertext, "base64")),
            decipher.final()
        ]).toString("utf-8");
    } catch {
        throw Object.assign(new Error("Das gespeicherte AI-Secret konnte nicht entschlüsselt werden."), { statusCode: 503, code: "AI_SECRET_DECRYPTION_FAILED" });
    }
}

export async function getTenantSecretStatus(name) {
    const secret = await prisma.tenantSecret.findFirst({
        where: { name },
        select: { updatedAt: true }
    });
    return { configured: Boolean(secret), updatedAt: secret?.updatedAt ?? null };
}

export async function getTenantSecret(name) {
    const secret = await prisma.tenantSecret.findFirst({ where: { name } });
    if (!secret) return null;
    return decryptTenantSecret(secret, { tenantId: getTenantId(), name });
}

export async function setTenantSecret(name, plaintext, auditContext = {}) {
    const tenantId = getTenantId();
    const encrypted = encryptTenantSecret(plaintext, { tenantId, name });
    return prisma.$transaction(async transaction => {
        const existing = await transaction.tenantSecret.findFirst({ where: { name }, select: { id: true } });
        const secret = existing
            ? await transaction.tenantSecret.update({ where: { id: existing.id }, data: encrypted })
            : await transaction.tenantSecret.create({ data: { name, ...encrypted } });
        await transaction.auditLog.create({
            data: {
                actorUserId: auditContext.actorUserId,
                action: existing ? "tenant.secret.rotate" : "tenant.secret.create",
                entityType: "TenantSecret",
                entityId: secret.id,
                metadata: { name },
                ipAddress: auditContext.ipAddress || null,
                userAgent: auditContext.userAgent || null
            }
        });
        return { configured: true, updatedAt: secret.updatedAt };
    });
}

export async function deleteTenantSecret(name, auditContext = {}) {
    return prisma.$transaction(async transaction => {
        const existing = await transaction.tenantSecret.findFirst({ where: { name }, select: { id: true } });
        if (!existing) return { configured: false, updatedAt: null };
        await transaction.tenantSecret.delete({ where: { id: existing.id } });
        await transaction.auditLog.create({
            data: {
                actorUserId: auditContext.actorUserId,
                action: "tenant.secret.delete",
                entityType: "TenantSecret",
                entityId: existing.id,
                metadata: { name },
                ipAddress: auditContext.ipAddress || null,
                userAgent: auditContext.userAgent || null
            }
        });
        return { configured: false, updatedAt: null };
    });
}

