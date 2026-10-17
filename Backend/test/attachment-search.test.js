import assert from "node:assert/strict";
import test from "node:test";

import {
    explicitLicense,
    normalizeAttachmentSearchSettings,
    validateAttachmentSearchSettings
} from "../src/modules/attachment-search/attachment-search.service.js";
import { decryptTenantSecret, encryptTenantSecret } from "../src/modules/attachment-search/tenant-secrets.service.js";

test("AI-Secrets werden mandantengebunden verschlüsselt und Manipulation wird erkannt", () => {
    const key = Buffer.alloc(32, 7);
    const context = { tenantId: "tenant-a", name: "openwebui-key", key };
    const encrypted = encryptTenantSecret("secret-value", context);

    assert.notEqual(encrypted.ciphertext, "secret-value");
    assert.equal(decryptTenantSecret(encrypted, context), "secret-value");
    assert.throws(() => decryptTenantSecret({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, context), /nicht entschlüsselt/);
    assert.throws(() => decryptTenantSecret(encrypted, { ...context, tenantId: "tenant-b" }), /nicht entschlüsselt/);
});

test("Lizenzprüfung akzeptiert konkrete Freigaben und keine bloße oder verneinte Erwähnung", () => {
    assert.match(explicitLicense("Licensed under Creative Commons CC BY 4.0 for reuse."), /Creative Commons/i);
    assert.equal(explicitLicense("This file is not public domain and is not Creative Commons."), null);
    assert.equal(explicitLicense("Information about Creative Commons in general."), null);
});

test("AttachementSearch normalisiert die mandantenbezogene Konfiguration", () => {
    const settings = normalizeAttachmentSearchSettings({
        enabled: 1,
        openWebUiEndpoint: "http://host.docker.internal:3000/",
        model: " carpenters-qwen3627b ",
        manufacturerWebsites: [{
            name: "Hersteller",
            baseUrl: "https://example.com/",
            downloadsApproved: false
        }]
    });

    assert.equal(settings.enabled, true);
    assert.equal(settings.openWebUiEndpoint, "http://host.docker.internal:3000");
    assert.equal(settings.model, "carpenters-qwen3627b");
    assert.equal(settings.manufacturerWebsites[0].baseUrl, "https://example.com");
});

test("freigegebene Downloads benötigen einen dokumentierten Rechtsgrund", () => {
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "https://openwebui.example.com",
        model: "carpenters-qwen3627b",
        manufacturerWebsites: [{
            name: "Hersteller",
            baseUrl: "https://example.com",
            downloadsApproved: true,
            licenseNote: ""
        }]
    }), /Lizenz-\/Freigabevermerk/);
});

test("Hersteller-Such-URLs bleiben auf der freigegebenen Domain", () => {
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "https://openwebui.example.com",
        model: "carpenters-qwen3627b",
        manufacturerWebsites: [{
            baseUrl: "https://example.com",
            searchUrlTemplate: "https://evil.example/search?q={articleNumber}"
        }]
    }), /Hersteller-Domain/);
});

test("Such-URL benötigt den Artikelnummern-Platzhalter", () => {
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "https://openwebui.example.com",
        model: "carpenters-qwen3627b",
        manufacturerWebsites: [{
            baseUrl: "https://example.com",
            searchUrlTemplate: "https://example.com/search"
        }]
    }), /articleNumber/);
});

test("öffentliche Remote-Open-WebUI-Endpunkte müssen HTTPS verwenden", () => {
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "http://openwebui.example.com",
        model: "carpenters-qwen3627b"
    }), /HTTPS/);
    assert.doesNotThrow(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "http://open-webui:8080",
        model: "carpenters-qwen3627b"
    }));
    assert.doesNotThrow(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "http://[::1]:3000",
        model: "carpenters-qwen3627b"
    }));
});

test("Open-WebUI-Endpunkt ist eine reine Basis-URL", () => {
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "https://openwebui.example.com/api",
        model: "carpenters-qwen3627b"
    }), /keinen Pfad/);
    assert.throws(() => validateAttachmentSearchSettings({
        openWebUiEndpoint: "https://openwebui.example.com?target=other",
        model: "carpenters-qwen3627b"
    }), /Query-String/);
});
