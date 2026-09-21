import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Employee portal login was merged into the shared /login screen.
 * Keep this route/file as a redirect so old bookmarks still work.
 */
export default function EmployeeLogin() {
  useEffect(() => {}, []);
  return <Navigate to="/login" replace />;
}
