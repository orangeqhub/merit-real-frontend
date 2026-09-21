import { useTranslation } from 'react-i18next';

const STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  active: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  inactive: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-600',
  changes_requested: 'bg-blue-50 text-blue-700',
  sold: 'bg-purple-50 text-purple-700',
};

export default function StatusBadge({ status }) {
  const { t } = useTranslation('common');
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {t(`status.${status}`, status)}
    </span>
  );
}
