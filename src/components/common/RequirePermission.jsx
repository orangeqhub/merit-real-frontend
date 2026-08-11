import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';

/**
 * Blocks direct URL access to a route when the logged-in user lacks the
 * required permission — used in addition to (never instead of) hiding the
 * sidebar link. Renders the shared Unauthorized page rather than crashing.
 */
export default function RequirePermission({ permission, children }) {
  const { user } = useAuthStore();

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
