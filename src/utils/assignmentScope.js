import { PERMISSIONS, hasPermission } from './permissions';

/**
 * Restricts a list of records to what `viewer` is allowed to see, based on
 * assignedEmployeeId / assignedMediatorId. This is the single enforcement
 * point used by every service (registrationService, propertyService,
 * enquiryService, visitService, userService) — components never filter
 * assignment scope themselves, they only pass the viewer through.
 *
 * - No viewer, or viewer.role === 'admin': unrestricted (returns list as-is).
 * - mode 'employee' + viewer.role === 'employee': only records where
 *   assignedEmployeeId === viewer.id; additionally includes unassigned
 *   records (assignedEmployeeId is null/undefined) if the viewer holds
 *   VIEW_UNASSIGNED_RECORDS.
 * - mode 'mediator' + viewer.role === 'mediator': only records where
 *   assignedMediatorId === viewer.id (no override permission).
 * - Any other viewer role for that mode: returns list unchanged (the
 *   route guards already prevent the wrong role from reaching this code).
 */
export function filterByAssignment(list, viewer, mode) {
  if (!viewer || viewer.role === 'admin') return list;

  if (mode === 'employee' && viewer.role === 'employee') {
    const canViewUnassigned = hasPermission(viewer, PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
    return list.filter((item) => {
      if (item.assignedEmployeeId === viewer.id) return true;
      if (canViewUnassigned && !item.assignedEmployeeId) return true;
      return false;
    });
  }

  if (mode === 'mediator' && viewer.role === 'mediator') {
    return list.filter((item) => item.assignedMediatorId === viewer.id);
  }

  return list;
}

export function buildAssignmentMeta(assignedEmployeeId, assignedMediatorId, assignedBy) {
  return {
    assignedEmployeeId: assignedEmployeeId || null,
    assignedMediatorId: assignedMediatorId || null,
    assignedBy: assignedBy || null,
    assignedAt: assignedEmployeeId || assignedMediatorId ? new Date().toISOString() : null,
  };
}
