/**
 * Single source of truth for "Post Property" access rules, shared by the
 * Navbar SELL button and the Hero CTA so the two entry points can never
 * diverge. Only approved Sellers may post properties.
 */
const POST_PROPERTY_ROLES = ['seller'];

export function resolvePostPropertyAction(user) {
  if (!user) {
    return { type: 'route', to: '/login', messageKey: 'nav.postPropertyLoginRequired', toastType: 'info' };
  }
  if (user.status !== 'approved') {
    return { type: 'route', to: '/application-status', messageKey: 'nav.postPropertyPendingApproval', toastType: 'info' };
  }
  if (POST_PROPERTY_ROLES.includes(user.role)) {
    return { type: 'route', to: '/post-property' };
  }
  return { type: 'blocked', messageKey: 'nav.postPropertyBlocked', toastType: 'error' };
}
