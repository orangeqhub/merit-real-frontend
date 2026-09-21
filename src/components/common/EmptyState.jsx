import { PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmptyState({ titleKey = 'empty.noResults', hintKey, icon: Icon = PackageSearch, action }) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
      <Icon size={40} className="text-brand-500" aria-hidden="true" />
      <p className="text-base font-medium text-gray-700">{t(titleKey)}</p>
      {hintKey && <p className="max-w-sm text-sm text-gray-500">{t(hintKey)}</p>}
      {action}
    </div>
  );
}
