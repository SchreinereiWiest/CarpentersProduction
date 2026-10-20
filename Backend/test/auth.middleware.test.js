import test from "node:test";
import assert from "node:assert/strict";
import {
    authorizeRoles
} from "../src/middleware/auth.middleware.js";
import { verifyCsrfToken, verifyRequestOrigin } from "../src/middleware/csrf.middleware.js";
import {
    canAccessFile,
    customerReferenceWhere,
    projectAccessWhere
} from "../src/middleware/resourceAuthorization.middleware.js";
import { createCustomerSearchQuery } from "../src/modules/customers/customer.controller.js";

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

test("Projektzugriff erlaubt Benutzern alle aktiven Projekte", () => {
    assert.deepEqual(
        projectAccessWhere({ id: "user-id", role: "user" }),
        { status: "active" }
    );
});

test("Projektzugriff beschränkt privilegierte Rollen nicht nach Status", () => {
    assert.deepEqual(projectAccessWhere({ id: "admin-id", role: "admin" }), {});
    assert.deepEqual(projectAccessWhere({ id: "manager-id", role: "manager" }), {});
});

test("Kundenreferenzen für Projekte prüfen keine Eigentümerschaft", () => {
    assert.deepEqual(customerReferenceWhere("customer-id"), {
        id: "customer-id",
        deletedAt: null
    });
});

test("Kundensuche liefert Benutzern ausschließlich ID sowie Vor- und Nachname", () => {
    const query = createCustomerSearchQuery({ role: "user" }, "Muster");

    assert.deepEqual(query.select, {
        id: true,
        firstName: true,
        lastName: true
    });
    assert.equal(query.where.OR.length, 2);
    assert.equal(query.where.OR.some(filter => Object.hasOwn(filter, "companyName")), false);
});

test("Privilegierte Kundensuche darf weiterhin Firmennamen durchsuchen", () => {
    const query = createCustomerSearchQuery({ role: "manager" }, "Muster");

    assert.equal(Object.hasOwn(query, "select"), false);
    assert.equal(query.where.OR.some(filter => Object.hasOwn(filter, "companyName")), true);
});

test("Dateizugriff folgt dem Status des zugehörigen Projekts", () => {
    const user = { id: "user-id", role: "user" };
    const baseFile = {
        uploadedById: "other-user-id",
        customer: { createdById: "other-user-id" }
    };

    assert.equal(canAccessFile(user, {
        ...baseFile,
        project: { status: "active", deletedAt: null }
    }), true);

    assert.equal(canAccessFile(user, {
        ...baseFile,
        project: { status: "inactive", deletedAt: null }
    }), false);

    assert.equal(canAccessFile(user, {
        ...baseFile,
        uploadedById: user.id,
        project: { status: "archive", deletedAt: null }
    }), false);

    assert.equal(canAccessFile(user, {
        ...baseFile,
        project: { status: "active", deletedAt: new Date() }
    }), false);
});

test('Betriebsbelege sind ausschließlich für Manager und Admins zugänglich', () => {
    const file = { category: 'management-document', uploadedById: 'user-id', project: { status: 'active', deletedAt: null } };
    assert.equal(canAccessFile({ id: 'user-id', role: 'user' }, file), false);
    assert.equal(canAccessFile({ role: 'manager' }, file), true);
    assert.equal(canAccessFile({ role: 'admin' }, file), true);
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
