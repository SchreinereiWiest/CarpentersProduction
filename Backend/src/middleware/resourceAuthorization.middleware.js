import prisma from "../infrastructure/database/prisma.js";

const isPrivileged = user => ["admin", "manager"].includes(user?.role);

const deny = res => res.status(403).json({ message: "Not authorized" });
const missing = (res, resource) => res.status(404).json({ message: `${resource} not found` });

export const projectAccessWhere = user => isPrivileged(user)
    ? {}
    : { status: "active" };

export const authorizeProject = (parameter = "id") => async (req, res, next) => {
    const project = await prisma.project.findFirst({
        where: {
            id: req.params[parameter],
            deletedAt: null,
            ...projectAccessWhere(req.user)
        },
        select: { id: true, customerId: true, createdById: true }
    });

    if (!project) return missing(res, "Project");
    req.authorizedProject = project;
    next();
};

export const authorizeProjectBody = (field = "projectId") => async (req, res, next) => {
    req.params.authorizationProjectId = req.body[field];
    return authorizeProject("authorizationProjectId")(req, res, next);
};

export const authorizeCustomer = (parameter = "id") => async (req, res, next) => {
    const customer = await prisma.customer.findFirst({
        where: {
            id: req.params[parameter],
            deletedAt: null,
            ...(isPrivileged(req.user) ? {} : { createdById: req.user.id })
        },
        select: { id: true }
    });

    if (!customer) return missing(res, "Customer");
    req.authorizedCustomer = customer;
    next();
};

export const authorizeCustomerBody = (field = "customerId") => async (req, res, next) => {
    req.params.authorizationCustomerId = req.body[field];
    return authorizeCustomer("authorizationCustomerId")(req, res, next);
};

export const canAccessFile = (user, file, { allowSharedShop = false } = {}) => {
    if (isPrivileged(user)) return true;
    if (file.category === 'management-document') return false;

    if (allowSharedShop && file.category === "shop") return true;

    if (file.project) {
        return file.project.status === "active" && !file.project.deletedAt;
    }

    return file.uploadedById === user.id
        || file.customer?.createdById === user.id;
};

export const authorizeFile = (parameter = "id", options = {}) => async (req, res, next) => {
    const file = await prisma.file.findFirst({
        where: {
            id: req.params[parameter],
            deletedAt: null
        },
        select: {
            id: true,
            category: true,
            uploadedById: true,
            project: { select: { status: true, deletedAt: true } },
            customer: { select: { createdById: true } }
        }
    });

    if (!file) return missing(res, "File");

    if (!canAccessFile(req.user, file, options)) return deny(res);
    req.authorizedFile = file;
    next();
};

export const authorizeUploadTarget = async (req, res, next) => {
    if (req.body.entity === "project") {
        req.params.uploadEntityId = req.body.entityId;
        return authorizeProject("uploadEntityId")(req, res, next);
    }

    if (req.body.entity === "customer") {
        req.params.uploadEntityId = req.body.entityId;
        return authorizeCustomer("uploadEntityId")(req, res, next);
    }

    return res.status(400).json({ message: "Invalid entity type" });
};

export const authorizeUserResource = (parameter = "id") => (req, res, next) => {
    if (isPrivileged(req.user) || req.params[parameter] === req.user.id) return next();
    return deny(res);
};

export const authorizeTimeEntry = (parameter = "id") => async (req, res, next) => {
    const entry = await prisma.timeEntry.findUnique({
        where: { id: req.params[parameter] },
        select: { id: true, userId: true }
    });

    if (!entry) return missing(res, "Time entry");
    if (!isPrivileged(req.user) && entry.userId !== req.user.id) return deny(res);

    req.authorizedTimeEntry = entry;
    next();
};
