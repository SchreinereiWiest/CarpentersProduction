import assert from "node:assert/strict";
import test from "node:test";

import {
    decryptTenantSecret,
    encryptTenantSecret
} from "../src/modules/secrets/tenant-secrets.service.js";

test("Verknüpfungs-Secrets werden mandantengebunden verschlüsselt", () => {
    const key = Buffer.alloc(32, 7);
    const context = { tenantId: "tenant-a", name: "ai-integration.api-key", key };
    const encrypted = encryptTenantSecret("secret-value", context);

    assert.notEqual(encrypted.ciphertext, "secret-value");
    assert.equal(decryptTenantSecret(encrypted, context), "secret-value");
    assert.throws(
        () => decryptTenantSecret({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, context),
        /nicht entschlüsselt/
    );
    assert.throws(
        () => decryptTenantSecret(encrypted, { ...context, tenantId: "tenant-b" }),
        /nicht entschlüsselt/
    );
});
