import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import FilterPanel from './FilterPanel';

export default function MobileFilterDrawer({ open, onClose, filters, onChange, onReset, hideCategory }) {
  const { t } = useTranslation('properties');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-warm-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <h2 className="font-semibold text-brand-800">{t('filters.title')}</h2>
          <button type="button" onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <FilterPanel filters={filters} onChange={onChange} onReset={onReset} hideCategory={hideCategory} />
        </div>
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white"
          >
            {t('buttons.applyFilters', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>
  );
}
