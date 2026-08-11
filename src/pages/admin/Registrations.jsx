import { useTranslation } from 'react-i18next';
import RegistrationApprovalList from '../../components/dashboard/RegistrationApprovalList';

export default function Registrations() {
  const { t } = useTranslation('common');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-brand-800">{t('nav.registrations')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('nav.registrationsSubtitle', {
            defaultValue: 'Review pending customer and agent registrations.',
          })}
        </p>
      </div>
      <RegistrationApprovalList />
    </div>
  );
}
