import bcrypt from "bcrypt";
import prisma, { systemPrisma } from "../config/prisma.js";
import { getLicense } from "../services/license/index.js";

const publicUser = (user, membership, additions = {}) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    email: user.email,
    role: membership.role,
    isActive: membership.isActive && user.isActive,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
    ...additions
});

async function membershipFor(tenantId, userId) {
    return systemPrisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId } },
        include: { user: true }
    });
}

async function requireManagedMembership(req, res) {
    const membership = await membershipFor(req.tenant.id, req.params.id);
    if (!membership) {
        res.status(404).json({ error: "Benutzer nicht gefunden" });
        return null;
    }
    return membership;
}

export async function getUsers(req, res) {
    try {
        const memberships = await systemPrisma.tenantMembership.findMany({
            where: { tenantId: req.tenant.id },
            include: { user: true },
            orderBy: [
                { user: { lastName: "asc" } },
                { user: { firstName: "asc" } },
                { user: { email: "asc" } }
            ]
        });

        return res.json({ users: memberships.map(item => publicUser(item.user, item)) });
    } catch (error) {
        console.error("getUsers:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getUser(req, res) {
    try {
        const membership = await requireManagedMembership(req, res);
        if (!membership) return;

        const files = await prisma.file.findMany({
            where: { uploadedById: membership.userId, deletedAt: null },
            orderBy: { uploadedAt: "desc" },
            select: { id: true, fileName: true, mimeType: true, fileSize: true, uploadedAt: true }
        });

        return res.json({ user: publicUser(membership.user, membership, { files }) });
    } catch (error) {
        console.error("getUser:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function newUser(req, res) {
    try {
        const { firstName, lastName, login, email, password, role = "user" } = req.body;
        if (!email || !password || !login) {
            return res.status(400).json({ error: "E-Mail, Login und Passwort sind erforderlich" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedLogin = login.trim();
        const license = await getLicense(req.tenant);

        if (license.maxUsers != null) {
            const currentUsers = await systemPrisma.tenantMembership.count({
                where: { tenantId: req.tenant.id, isActive: true }
            });
            if (currentUsers >= license.maxUsers) {
                return res.status(409).json({ error: `Die Lizenz erlaubt maximal ${license.maxUsers} Benutzer` });
            }
        }

        const [byEmail, byLogin] = await Promise.all([
            systemPrisma.user.findUnique({ where: { email: normalizedEmail } }),
            systemPrisma.user.findUnique({ where: { login: normalizedLogin } })
        ]);

        if ((byEmail || byLogin) && byEmail?.id !== byLogin?.id) {
            return res.status(409).json({ error: "E-Mail oder Login wird bereits verwendet" });
        }

        const result = await systemPrisma.$transaction(async db => {
            const user = byEmail ?? byLogin ?? await db.user.create({
                data: {
                    firstName: firstName?.trim() || null,
                    lastName: lastName?.trim() || null,
                    login: normalizedLogin,
                    email: normalizedEmail,
                    passwordHash: await bcrypt.hash(password, 12),
                    role,
                    isActive: true
                }
            });

            const existing = await db.tenantMembership.findUnique({
                where: { tenantId_userId: { tenantId: req.tenant.id, userId: user.id } }
            });
            if (existing) {
                const error = new Error("Benutzer gehört bereits zu diesem Unternehmen");
                error.statusCode = 409;
                throw error;
            }

            const membership = await db.tenantMembership.create({
                data: { tenantId: req.tenant.id, userId: user.id, role }
            });
            return { user, membership };
        });

        return res.status(201).json({ user: publicUser(result.user, result.membership) });
    } catch (error) {
        console.error("newUser:", error);
        if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
        if (error.code === "P2002") return res.status(409).json({ error: "E-Mail oder Login wird bereits verwendet" });
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateUser(req, res) {
    try {
        const membership = await requireManagedMembership(req, res);
        if (!membership) return;

        const userData = {};
        if (req.body.firstName !== undefined) userData.firstName = req.body.firstName?.trim() || null;
        if (req.body.lastName !== undefined) userData.lastName = req.body.lastName?.trim() || null;
        if (req.body.login !== undefined) {
            if (!req.body.login.trim()) return res.status(400).json({ error: "Login darf nicht leer sein" });
            userData.login = req.body.login.trim();
        }
        if (req.body.email !== undefined) {
            if (!req.body.email.trim()) return res.status(400).json({ error: "E-Mail-Adresse darf nicht leer sein" });
            userData.email = req.body.email.trim().toLowerCase();
        }

        const membershipData = {};
        if (req.body.role !== undefined) membershipData.role = req.body.role;
        if (req.body.isActive !== undefined) membershipData.isActive = Boolean(req.body.isActive);

        const result = await systemPrisma.$transaction(async db => ({
            user: Object.keys(userData).length
                ? await db.user.update({ where: { id: membership.userId }, data: userData })
                : membership.user,
            membership: Object.keys(membershipData).length
                ? await db.tenantMembership.update({ where: { id: membership.id }, data: membershipData })
                : membership
        }));

        return res.json({ user: publicUser(result.user, result.membership) });
    } catch (error) {
        console.error("updateUser:", error);
        if (error.code === "P2002") return res.status(409).json({ error: "E-Mail oder Login wird bereits verwendet" });
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function changeUserPassword(req, res) {
    try {
        const membership = await requireManagedMembership(req, res);
        if (!membership) return;
        if (!req.body.password || req.body.password.length < 8) {
            return res.status(400).json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein" });
        }

        await systemPrisma.user.update({
            where: { id: membership.userId },
            data: { passwordHash: await bcrypt.hash(req.body.password, 12), authVersion: { increment: 1 } }
        });
        return res.json({ message: "Passwort erfolgreich geändert" });
    } catch (error) {
        console.error("changeUserPassword:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function deleteUser(req, res) {
    try {
        const membership = await requireManagedMembership(req, res);
        if (!membership) return;
        if (membership.userId === req.user.id) {
            return res.status(409).json({ error: "Das eigene Firmenkonto kann nicht entfernt werden" });
        }

        const updated = await systemPrisma.tenantMembership.update({
            where: { id: membership.id },
            data: { isActive: false }
        });
        return res.json({ user: publicUser(membership.user, updated) });
    } catch (error) {
        console.error("deleteUser:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

const currentUserSelect = {
    id: true, firstName: true, lastName: true, email: true, login: true
};

export async function getCurrentUser(req, res) {
    const user = await systemPrisma.user.findUnique({ where: { id: req.user.id }, select: currentUserSelect });
    if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });
    return res.json({ user: { ...user, role: req.user.role, tenant: req.tenant } });
}

export async function updateCurrentUser(req, res) {
    try {
        const email = req.body.email?.trim().toLowerCase();
        if (!email) return res.status(400).json({ error: "E-Mail-Adresse darf nicht leer sein" });
        const user = await systemPrisma.user.update({
            where: { id: req.user.id },
            data: {
                firstName: req.body.firstName?.trim() || null,
                lastName: req.body.lastName?.trim() || null,
                email
            },
            select: currentUserSelect
        });
        return res.json({ user: { ...user, role: req.user.role, tenant: req.tenant } });
    } catch (error) {
        if (error.code === "P2002") return res.status(409).json({ error: "Diese E-Mail-Adresse wird bereits verwendet" });
        console.error("updateCurrentUser:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function changeCurrentUserPassword(req, res) {
    try {
        const { currentPassword, password } = req.body;
        if (!currentPassword) return res.status(400).json({ error: "Das aktuelle Passwort ist erforderlich" });
        if (!password || password.length < 8) return res.status(400).json({ error: "Das neue Passwort muss mindestens 8 Zeichen lang sein" });

        const current = await systemPrisma.user.findUnique({ where: { id: req.user.id } });
        if (!current || !await bcrypt.compare(currentPassword, current.passwordHash)) {
            return res.status(401).json({ error: "Das aktuelle Passwort ist nicht korrekt" });
        }

        await systemPrisma.user.update({
            where: { id: req.user.id },
            data: { passwordHash: await bcrypt.hash(password, 12), authVersion: { increment: 1 } }
        });
        return res.json({ message: "Passwort erfolgreich geändert" });
    } catch (error) {
        console.error("changeCurrentUserPassword:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
