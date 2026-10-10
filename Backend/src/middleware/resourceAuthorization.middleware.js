import prisma from "../config/prisma.js";

const isPrivileged = user => ["admin", "manager"].includes(user?.role);

const deny = res => res.status(403).json({ message: "Not authorized" });
const missing = (res, resource) => res.status(404).json({ message: `${resource} not found` });

export const projectAccessWhere = user => isPrivileged(user)
    ? {}
    : {
        OR: [
            { createdById: user.id },
            { timeEntries: { some: { userId: user.id } } }
        ]
    };

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

export const authorizeFile = (parameter = "id") => async (req, res, next) => {
    const file = await prisma.file.findFirst({
        where: {
            id: req.params[parameter],
            deletedAt: null
        },
        select: {
            id: true,
            uploadedById: true,
            project: { select: { createdById: true, timeEntries: { where: { userId: req.user.id }, select: { id: true }, take: 1 } } },
            customer: { select: { createdById: true } }
        }
    });

    if (!file) return missing(res, "File");

    const allowed = isPrivileged(req.user)
        || file.uploadedById === req.user.id
        || file.project?.createdById === req.user.id
        || file.project?.timeEntries.length > 0
        || file.customer?.createdById === req.user.id;

    if (!allowed) return deny(res);
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
