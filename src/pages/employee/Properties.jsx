import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { propertyModerationService } from '../../services/propertyModerationService';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { matchesSearch } from '../../utils/search';
import { getLocalizedField } from '../../utils/localize';
import SearchBox from '../../components/common/SearchBox';
import EmptyState from '../../components/common/EmptyState';

const STATUSES = ['submitted', 'in_review', 'changes_requested', 'recommended_approval', 'recommended_rejection', 'completed'];

function isOverdue(p) {
  return p.dueDate && new Date(p.dueDate) < new Date() && p.moderationStatus !== 'completed';
}

export default function Properties() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (user) propertyModerationService.getAssignedProperties(user).then(setRecords);
  }, [user]);

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((p) => {
      if (status && p.moderationStatus !== status) return false;
      if (overdueOnly && !isOverdue(p)) return false;
      return matchesSearch(p, debouncedSearch, [
        'propertyCode',
        'sellerId',
        'contactPhone',
        'titleEn',
        'titleTe',
        'locationEn',
        'categorySlug',
        'ventureName',
      ]);
    });
  }, [records, status, overdueOnly, debouncedSearch]);

  if (records === null) return null;

  return (
    <div>
      <h1 className="mb-4 font-semibold text-brand-800">{t('moderation.title')}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <SearchBox value={search} onChange={setSearch} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">{t('filters.all')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`moderationStatus.${s}`)}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
          {t('filters.overdue')}
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/employee/properties/${p.id}`} className="block rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800 lang-te">{getLocalizedField(p, 'title', language)}</p>
                  <p className="text-xs text-gray-400">{p.propertyCode}</p>
                  <p className="mt-1 text-sm text-gray-500 lang-te">{getLocalizedField(p, 'location', language)} &middot; ₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{t(`moderationStatus.${p.moderationStatus}`)}</span>
                  {isOverdue(p) && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t('filters.overdue')}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
