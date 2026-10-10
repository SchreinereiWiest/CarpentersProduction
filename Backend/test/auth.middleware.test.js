import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import {
    authenticateAdmin,
    authorizeRoles
} from "../src/middleware/auth.middleware.js";

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

test("authenticateAdmin akzeptiert ein gültiges Admin-Token", () => {
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "test-secret-with-sufficient-length";

    try {
        const token = jwt.sign(
            { id: "admin-id", role: "admin" },
            process.env.JWT_ACCESS_SECRET
        );
        const req = { cookies: { token } };
        const res = createResponse();
        let nextCalled = false;

        authenticateAdmin(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
        assert.equal(req.user.id, "admin-id");
        assert.equal(req.user.role, "admin");
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previousSecret;
    }
});

test("authenticateAdmin lehnt normale Benutzer mit 403 ab", () => {
    const previousSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "test-secret-with-sufficient-length";

    try {
        const token = jwt.sign(
            { id: "user-id", role: "user" },
            process.env.JWT_ACCESS_SECRET
        );
        const req = { cookies: { token } };
        const res = createResponse();

        authenticateAdmin(req, res, () => {
            assert.fail("next darf nicht aufgerufen werden");
        });

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.payload, { message: "Not authorized" });
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
        else process.env.JWT_ACCESS_SECRET = previousSecret;
    }
});
