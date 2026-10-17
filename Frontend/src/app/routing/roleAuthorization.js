const ROLE_GROUPS = {
    user: new Set(["user", "manager", "admin"]),
    admin: new Set(["manager", "admin"]),
    adminOnly: new Set(["admin"])
};

export function canAccessRequiredRole(userRole, requiredRole) {
    if (!requiredRole) return true;

    return ROLE_GROUPS[requiredRole]?.has(userRole) ?? false;
}
