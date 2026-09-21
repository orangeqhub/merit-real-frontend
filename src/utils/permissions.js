export const PERMISSIONS = {
  VIEW_UNASSIGNED_RECORDS: 'VIEW_UNASSIGNED_RECORDS',
};

export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

/**
 * Throws a meaningful, translatable error if `user` isn't an authenticated,
 * approved employee/admin holding `permission`. Admins bypass the permission
 * check (they aren't granted employee permissions individually) but still
 * must be authenticated. Every employee-workflow service method calls this
 * before touching data, so permission is enforced at the service layer, not
 * just by hiding buttons in the UI.
 */
export function requirePermission(user, permission) {
  if (!user || user.status !== 'approved') {
    throw new Error('permission.error.notAuthenticated');
  }
  if (user.role === 'admin') return;
  if (user.role !== 'employee') {
    throw new Error('permission.error.wrongRole');
  }
  if (permission && !hasPermission(user, permission)) {
    throw new Error('permission.error.missingPermission');
  }
}
