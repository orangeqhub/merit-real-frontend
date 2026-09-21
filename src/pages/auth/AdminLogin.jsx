import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import PortalLoginCard from '../../components/auth/PortalLoginCard';

const ERROR_KEYS = {
  INVALID_CREDENTIALS: 'portal.invalidAdminCredentials',
  ACCOUNT_INACTIVE: 'portal.adminAccountInactive',
};

export default function AdminLogin() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [loginId, setLoginId] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit({ id, password }) {
    setError('');
    setSubmitting(true);
    try {
      const user = await authService.loginAdmin(id, password, rememberMe);
      setUser(user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(t(ERROR_KEYS[err.message] || 'portal.invalidAdminCredentials'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PortalLoginCard
      heading={t('portal.adminPortalHeading')}
      secureMessage={t('portal.secureAdminAccess')}
      idLabel={t('portal.adminLoginId')}
      idValue={loginId}
      onIdChange={setLoginId}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      rememberMe={rememberMe}
      onRememberChange={setRememberMe}
    />
  );
}
