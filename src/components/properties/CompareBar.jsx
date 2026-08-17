import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, X } from 'lucide-react';
import { useCompareStore, COMPARE_LIMITS } from '../../store/compareStore';

export default function CompareBar() {
  const { t } = useTranslation('dashboard');
  const location = useLocation();
  const ids = useCompareStore((s) => s.ids);
  const clear = useCompareStore((s) => s.clear);
  const remove = useCompareStore((s) => s.remove);

  const hasOwnFixedBar = location.pathname === '/buyer/compare' || /^\/properties\/[^/]+$/.test(location.pathname);
  if (ids.length === 0 || hasOwnFixedBar) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-warm-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Scale size={18} className="text-brand-600" />
          <span className="font-medium">{ids.length}/{COMPARE_LIMITS.MAX_COMPARE}</span>
          <div className="hidden gap-1 sm:flex">
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700"
              >
                {id} <X size={12} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={clear} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            {t('compare.clearAll')}
          </button>
          <Link
            to="/buyer/compare"
            aria-disabled={ids.length < COMPARE_LIMITS.MIN_COMPARE}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-warm-white ${
              ids.length < COMPARE_LIMITS.MIN_COMPARE ? 'pointer-events-none bg-gray-300' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {t('compare.compareNow')}
          </Link>
        </div>
      </div>
    </div>
  );
}
