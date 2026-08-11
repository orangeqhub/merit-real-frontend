import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROLE_HOME } from '../../config/navigation';

export default function Unauthorized() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <ShieldAlert size={40} className="mx-auto text-red-500" />
      <h1 className="mt-4 text-2xl font-bold text-brand-800">{t('unauthorized.title')}</h1>
      <p className="mt-2 text-gray-600">{t('unauthorized.body')}</p>
      <Link
        to={user ? ROLE_HOME[user.role] || '/' : '/'}
        className="mt-6 inline-block rounded-full bg-brand-500 px-5 py-2 text-warm-white"
      >
        {t('unauthorized.goBack')}
      </Link>
    </div>
  );
}
