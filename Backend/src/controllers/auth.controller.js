import { systemPrisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";
import {
  csrfCookieClearOptions,
  sessionCookieClearOptions,
  sessionCookieOptions
} from "../config/security.js";
import { issueCsrfToken } from "../middleware/csrf.middleware.js";

import { comparePassword } from "../utils/passwords.js";
import { assertActiveLicense } from "../services/license/index.js";

/**
 * Firmengebundener Login.
 * Firma, Benutzer und Passwort bilden gemeinsam die Zugangsdaten; erst nach
 * Membership- und Lizenzprüfung wird das HttpOnly-Sitzungscookie ausgestellt.
 */

export const login = async (req, res) => {
  try {
    const { company, login, password } = req.body;

    if (!company || !login || !password) {
      return res
        .status(400)
        .json({ error: "Firma, Benutzer und Passwort sind erforderlich" });
    }

    // Name und Slug sind zulässig: Name ist benutzerfreundlich und an die Lizenz
    // gebunden, der Slug bleibt eine stabile technische Login-Alternative.
    const companyInput = String(company).trim();
    const tenant = await systemPrisma.tenant.findFirst({
      where: {
        status: "active",
        OR: [
          { name: { equals: companyInput, mode: "insensitive" } },
          { slug: { equals: companyInput, mode: "insensitive" } }
        ]
      }
    });

    if (!tenant) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Einheitliche Fehlerantworten verhindern die Enumeration vorhandener
    // Unternehmen, Benutzernamen und Mitgliedschaften.
    const user = await systemPrisma.user.findUnique({
      where: {
        login: login
      }
    });

    if (!user || !user.isActive || user.deletedAt) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const valid = await comparePassword(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    // Ein gültiges globales Konto erhält nur Zugriff, wenn es genau diesem
    // Mandanten aktiv zugeordnet ist.
    const membership = await systemPrisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } }
    });

    if (!membership?.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Ohne aktive, zum Firmennamen passende Lizenz wird keine Sitzung erzeugt.
    const license = await assertActiveLicense(tenant);

    // tenantId und authVersion binden die Sitzung an Firma und Kontostand. Die
    // Rolle wird serverseitig trotzdem bei jedem Request neu aus der Membership
    // gelesen und nicht blind aus dem Token übernommen.
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        login: user.login,
        role: membership.role,
        tenantId: tenant.id,
        authVersion: user.authVersion
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "72h" }
    );

    res.cookie("token", token, sessionCookieOptions);
    const csrfToken = issueCsrfToken(res);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        login: user.login,
        role: membership.role,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        features: license.features
      },
      csrfToken
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

export const logout = async (req, res) => {
  try {
    // Cookie-Löschen beendet nur diesen Browser. Die authVersion widerruft auch
    // kopierte oder auf anderen Geräten noch vorhandene Tokens dieses Kontos.
    await systemPrisma.user.update({
      where: { id: req.user.id },
      data: { authVersion: { increment: 1 } }
    });

    res.clearCookie("token", sessionCookieClearOptions);
    res.clearCookie("XSRF-TOKEN", csrfCookieClearOptions);
    return res.status(204).end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Die Benutzerliste wird über die Membership gefiltert. Ein globales
    // user.findMany würde Identitäten anderer Unternehmen sichtbar machen.
    const memberships = await systemPrisma.tenantMembership.findMany({
      where: { tenantId: req.tenant.id, isActive: true },
      include: { user: true },
      orderBy: { user: { email: "asc" } }
    });

    const filterUser = [];
    memberships.forEach(({ user }) => {
      filterUser.push({ id: user.id, email: user.email });
    });

    res.status(200).json({
      filterUser
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Internal server error"
    });
  }
};
