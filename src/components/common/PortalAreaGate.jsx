import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import DashboardLayout from '../layout/DashboardLayout';

/**
 * Shared guard for the Admin and Employee portals. Unlike ProtectedRoute
 * (used by Buyer/Seller/Mediator, which redirects an unauthenticated visitor
 * to the public /login), this renders the portal's OWN dedicated login page
 * inline for any visitor who isn't an authenticated, approved user of that
 * exact role — including someone already logged in as a different role, and
 * including direct URL navigation straight to a nested route such as
 * /admin/dashboard. That single check is what keeps Buyer/Seller/Mediator/
 * Employee sessions out of Admin routes (and vice versa) with no separate
 * per-route guard needed. Once authenticated as that role, visiting the bare
 * portal root (e.g. /admin) redirects straight to its dashboard.
 */
export default function PortalAreaGate({ role, dashboardPath, LoginComponent }) {
  const { user, loading, initialised } = useAuthStore();
  const location = useLocation();

  if (loading || !initialised) return null;

  // Wrong-role or unauthenticated → portal's own login (do not render admin child routes).
  if (!user || user.role !== role || user.status !== 'approved') {
    return <LoginComponent />;
  }

  if (location.pathname === `/${role}`) {
    return <Navigate to={dashboardPath} replace />;
  }

  return <DashboardLayout role={role} />;
}
