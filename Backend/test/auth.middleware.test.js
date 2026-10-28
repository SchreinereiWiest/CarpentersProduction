import test from "node:test";
import assert from "node:assert/strict";
import {
    authorizeRoles,
    requireFeature
} from "../src/middleware/auth.middleware.js";
import { verifyCsrfToken, verifyRequestOrigin } from "../src/middleware/csrf.middleware.js";
import {
    canAccessFile,
    customerReferenceWhere,
    projectAccessWhere
} from "../src/middleware/resourceAuthorization.middleware.js";
import {
    createCustomerDisplayStatusWhere,
    createCustomerSearchQuery,
    getCustomerDisplayStatus
} from "../src/modules/customers/customer.controller.js";

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

test("requireFeature lässt nur explizit lizenzierte Module passieren", () => {
    const allowedRequest = { license: { features: ["crm", "calculation"] } };
    const allowedResponse = createResponse();
    let nextCalled = false;
    requireFeature("calculation")(allowedRequest, allowedResponse, () => { nextCalled = true; });
    assert.equal(nextCalled, true);

    const deniedResponse = createResponse();
    requireFeature("business-management")(allowedRequest, deniedResponse, () => {
        assert.fail("next darf ohne Modulfreigabe nicht aufgerufen werden");
    });
    assert.equal(deniedResponse.statusCode, 403);
    assert.equal(deniedResponse.payload.error, "LICENSE_FEATURE_MISSING");
});

test("Projektzugriff erlaubt Benutzern aktive und selbst angelegte inaktive Projekte", () => {
    assert.deepEqual(
        projectAccessWhere({ id: "user-id", role: "user" }),
        {
            OR: [
                { status: "active" },
                { createdById: "user-id" }
            ]
        }
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

test("Kundenstatus ist nur bei ausschließlich archivierten Projekten inaktiv", () => {
    assert.equal(getCustomerDisplayStatus([]), "active");
    assert.equal(getCustomerDisplayStatus([{ status: "archive" }]), "inactive");
    assert.equal(getCustomerDisplayStatus([
        { status: "archive" },
        { status: "inactive" }
    ]), "active");
    assert.equal(getCustomerDisplayStatus([
        { status: "archive" },
        { status: "active" }
    ]), "active");
    assert.equal(getCustomerDisplayStatus([
        { status: "archive" },
        { status: "active", deletedAt: new Date() }
    ]), "inactive");
});

test("Kundenstatusfilter ignorieren gelöschte Projekte", () => {
    const activeWhere = createCustomerDisplayStatusWhere("active");
    const inactiveWhere = createCustomerDisplayStatusWhere("inactive");

    assert.deepEqual(activeWhere.OR[0], {
        projects: { none: { deletedAt: null } }
    });
    assert.deepEqual(inactiveWhere.projects, {
        some: { deletedAt: null },
        none: {
            deletedAt: null,
            status: { not: "archive" }
        }
    });
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
        project: { status: "inactive", deletedAt: null, createdById: user.id }
    }), true);

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

test("CSRF-Prüfung lässt ausschließlich die öffentlichen Auth-Einstiege ohne Token zu", () => {
    for (const path of ["/api/auth/login", "/api/auth/bootstrap"]) {
        const req = { method: "POST", path, cookies: {}, get() { return undefined; } };
        const res = createResponse();
        let nextCalled = false;

        verifyCsrfToken(req, res, () => { nextCalled = true; });
        assert.equal(nextCalled, true);
    }
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
