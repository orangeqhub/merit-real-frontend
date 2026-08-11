import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { enquiryService } from '../../services/enquiryService';
import { useAuthStore } from '../../store/authStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { matchesSearch } from '../../utils/search';
import SearchBox from '../../components/common/SearchBox';
import EmptyState from '../../components/common/EmptyState';

const STATUSES = ['new', 'contacted', 'followup_required', 'visit_requested', 'converted', 'closed', 'not_interested'];

function isOverdue(e) {
  return e.nextFollowUpAt && new Date(e.nextFollowUpAt) < new Date() && e.status !== 'closed';
}

export default function Enquiries() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [records, setRecords] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    enquiryService.getAssignedEnquiries(user)
      .then((list) => { if (!cancelled) setRecords(list || []); })
      .catch(() => { if (!cancelled) setRecords([]); });
    return () => { cancelled = true; };
  }, [user]);

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((e) => {
      if (status && e.status !== status) return false;
      if (overdueOnly && !isOverdue(e)) return false;
      return matchesSearch(e, debouncedSearch, ['id', 'buyerPhone', 'propertyId', 'buyerName']);
    });
  }, [records, status, overdueOnly, debouncedSearch]);

  if (records === null) return null;

  return (
    <div>
      <h1 className="mb-4 font-semibold text-brand-800">{t('nav.enquiries', { ns: 'common' })}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <SearchBox value={search} onChange={setSearch} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">{t('filters.all')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`enquiryStatus.${s}`)}</option>)}
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
          {filtered.map((e) => (
            <Link key={e.id} to={`/employee/enquiries/${e.id}`} className="block rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{e.buyerName} &middot; {e.buyerPhone}</p>
                  <p className="text-sm text-gray-500">{e.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{t(`enquiryStatus.${e.status}`)}</span>
                  {isOverdue(e) && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t('filters.overdue')}</span>}
                  {e.priority && <span className="text-xs text-gray-400">{t('verification.priority')}: {t(`priority.${e.priority}`)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
