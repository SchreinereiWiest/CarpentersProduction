import test from "node:test";
import assert from "node:assert/strict";
import {
    authorizeRoles
} from "../src/middleware/auth.middleware.js";
import { verifyCsrfToken, verifyRequestOrigin } from "../src/middleware/csrf.middleware.js";

function createResponse() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

test("authorizeRoles lässt konfigurierte Rollen passieren", () => {
    const req = { user: { id: "user-id", role: "manager" } };
    const res = createResponse();
    let nextCalled = false;

    authorizeRoles("admin", "manager")(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
});

test("authorizeRoles antwortet bei fehlender Rolle mit 403", () => {
    const req = { user: { id: "user-id", role: "user" } };
    const res = createResponse();

    authorizeRoles("admin", "manager")(req, res, () => {
        assert.fail("next darf nicht aufgerufen werden");
    });

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.payload, { message: "Not authorized" });
});

test("authorizeRoles verlangt eine authentifizierte Identität", () => {
    const req = {};
    const res = createResponse();

    authorizeRoles("admin")(req, res, () => {
        assert.fail("next darf nicht aufgerufen werden");
    });

    assert.equal(res.statusCode, 401);
});

test("CSRF-Prüfung akzeptiert übereinstimmendes Cookie und Header", () => {
    const token = "a".repeat(64);
    const req = {
        method: "POST",
        path: "/api/projects/new",
        cookies: { "XSRF-TOKEN": token },
        get(name) {
            return name === "x-xsrf-token" ? token : undefined;
        }
    };
    const res = createResponse();
    let nextCalled = false;

    verifyCsrfToken(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
});

test("CSRF-Prüfung lehnt fehlenden Header mit 403 ab", () => {
    const req = {
        method: "DELETE",
        path: "/api/files/delete/id",
        cookies: { "XSRF-TOKEN": "a".repeat(64) },
        get() { return undefined; }
    };
    const res = createResponse();

    verifyCsrfToken(req, res, () => assert.fail("next darf nicht aufgerufen werden"));
    assert.equal(res.statusCode, 403);
});

test("Origin-Prüfung lehnt fremde Origins ab", () => {
    const req = {
        method: "POST",
        get(name) { return name === "origin" ? "https://evil.example" : undefined; }
    };
    const res = createResponse();

    verifyRequestOrigin(req, res, () => assert.fail("next darf nicht aufgerufen werden"));
    assert.equal(res.statusCode, 403);
});
