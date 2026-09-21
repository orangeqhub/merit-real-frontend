import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { verificationService } from '../../services/verificationService';
import { useAuthStore } from '../../store/authStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { matchesSearch } from '../../utils/search';
import SearchBox from '../../components/common/SearchBox';
import EmptyState from '../../components/common/EmptyState';

const STATUSES = ['pending_review', 'in_review', 'correction_requested', 'recommended_approval', 'recommended_rejection', 'completed'];

function isOverdue(record) {
  return record.dueDate && new Date(record.dueDate) < new Date() && record.verificationStatus !== 'completed';
}

export default function Verifications() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (user) verificationService.getAssignedVerifications(user).then(setRecords);
  }, [user]);

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      if (status && r.verificationStatus !== status) return false;
      if (overdueOnly && !isOverdue(r)) return false;
      return matchesSearch(r, debouncedSearch, ['memberId', 'registrationId', 'name', 'mobile', 'email', 'district', 'city']);
    });
  }, [records, status, overdueOnly, debouncedSearch]);

  if (records === null) return null;

  return (
    <div>
      <h1 className="mb-4 font-semibold text-brand-800">{t('verification.title')}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <SearchBox value={search} onChange={setSearch} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">{t('filters.all')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`verificationStatus.${s}`)}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
          {t('filters.overdue', { defaultValue: 'Overdue' })}
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to={`/employee/verifications/${r.id}`}
              className="block rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{r.name} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{r.role}</span></p>
                  <p className="text-xs text-gray-400">{r.registrationId}</p>
                  <p className="mt-1 text-sm text-gray-500">{r.mobile} &middot; {r.city}, {r.district}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    {t(`verificationStatus.${r.verificationStatus}`)}
                  </span>
                  {isOverdue(r) && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t('filters.overdue', { defaultValue: 'Overdue' })}</span>
                  )}
                  {r.priority && (
                    <span className="text-xs capitalize text-gray-400">{t('verification.priority')}: {t(`priority.${r.priority}`)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
