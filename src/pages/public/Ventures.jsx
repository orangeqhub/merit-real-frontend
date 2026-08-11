import { useTranslation } from 'react-i18next';
import PropertyListing from './PropertyListing';

export default function Ventures() {
  const { t } = useTranslation('common');
  return (
    <div>
      <div className="bg-brand-50 py-10 text-center">
        <h1 className="text-2xl font-bold text-brand-800 sm:text-3xl">{t('sections.ventures')}</h1>
      </div>
      <PropertyListing forcedCategorySlug="ventures" />
    </div>
  );
}
