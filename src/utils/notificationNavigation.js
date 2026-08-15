const REFERENCE_OPEN_ROUTES = {
  express_interest: {
    buyer: '/buyer/interests',
    customer: '/buyer/interests',
    admin: '/admin/express-interests',
    agent: '/mediator/leads',
    mediator: '/mediator/leads',
    sales_member: '/sales/leads',
    employee: '/employee/enquiries',
  },
  booking_request: {
    buyer: '/buyer/bookings',
    customer: '/buyer/bookings',
    admin: '/admin/bookings',
    agent: '/mediator/bookings',
    mediator: '/mediator/bookings',
    sales_member: '/sales/bookings',
  },
  purchase_request: {
    buyer: '/buyer/purchases',
    customer: '/buyer/purchases',
    admin: '/admin/purchases',
    agent: '/mediator/purchases',
    mediator: '/mediator/purchases',
    sales_member: '/sales/purchases',
  },
  site_visit: {
    buyer: '/buyer/visits',
    customer: '/buyer/visits',
    admin: '/admin/visits',
    agent: '/mediator/visits',
    mediator: '/mediator/visits',
    employee: '/employee/visits',
    sales_member: '/sales/visits',
  },
};

function withOpenParam(path, entityId) {
  if (!entityId || !path) return path;
  if (String(path).includes('open=')) return path;
  if (/\/\d+$/.test(String(path).split('?')[0])) return path;
  const sep = String(path).includes('?') ? '&' : '?';
  return `${path}${sep}open=${entityId}`;
}

function bookingDetailRoute(role, entityId) {
  const id = Number(entityId);
  if (!Number.isFinite(id)) return null;
  if (role === 'buyer' || role === 'customer') return `/buyer/bookings/${id}`;
  const listPath = REFERENCE_OPEN_ROUTES.booking_request[role] || '/buyer/bookings';
  return withOpenParam(listPath, id);
}

/**
 * Resolve where a notification should navigate, including deep-link params.
 */
export function resolveNotificationTarget(notification, role = 'buyer') {
  if (!notification) return null;

  const refType = notification.referenceType || notification.relatedType;
  const refId = notification.referenceId || notification.relatedId;
  let route = notification.linkPath || null;
  const state = {};

  if (refType === 'booking_request' && refId) {
    const detail = bookingDetailRoute(role, refId);
    if (detail && (!route || route.endsWith('/bookings') || route === '/mediator/bookings' || route === '/admin/bookings')) {
      route = detail;
    }
    state.openBookingId = refId;
  }

  if (refType === 'express_interest' && refId) {
    state.openInterestId = refId;
    if (!route || !String(route).includes('open=')) {
      const base = REFERENCE_OPEN_ROUTES.express_interest[role] || '/buyer/interests';
      route = route ? withOpenParam(route, refId) : withOpenParam(base, refId);
    }
  }

  if (refType === 'purchase_request' && refId) {
    state.openPurchaseId = refId;
    if (!route || !String(route).includes('open=')) {
      const base = REFERENCE_OPEN_ROUTES.purchase_request[role] || '/buyer/purchases';
      route = route ? withOpenParam(route, refId) : withOpenParam(base, refId);
    }
  }

  if (refType === 'site_visit' && refId) {
    state.openVisitId = refId;
    if (!route || !String(route).includes('open=')) {
      const base = REFERENCE_OPEN_ROUTES.site_visit[role] || '/buyer/visits';
      route = route ? withOpenParam(route, refId) : withOpenParam(base, refId);
    }
  }

  if (!route) return null;

  return {
    route,
    state,
    entityType: refType || null,
    entityId: refId || null,
  };
}

export function navigateFromNotification(notification, role, navigate) {
  const target = resolveNotificationTarget(notification, role);
  if (!target?.route) return false;
  navigate(target.route, { state: target.state });
  return true;
}
