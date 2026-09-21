/**
 * Where logout should land depending on which portal the session belonged
 * to — Admin returns to /admin login; everyone else (including employees)
 * returns to the shared public /login page.
 */
export function getLogoutRedirectPath(role) {
  if (role === 'admin') return '/admin';
  return '/login';
}
