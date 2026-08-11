import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck } from 'lucide-react';
import { visitService } from '../../services/visitService';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../store/authStore';
import EmptyState from '../../components/common/EmptyState';
import { toast } from '../../store/toastStore';

const OUTCOMES = ['interested', 'needs_followup', 'negotiation', 'not_interested', 'deal_progressing', 'closed'];

export default function Visits() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [visits, setVisits] = useState(null);
  const [titles, setTitles] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});

  function load() {
    if (!user) return;
    visitService.getAssignedVisits(user)
      .then(async (list) => {
        const rows = Array.isArray(list) ? list : [];
        setVisits(rows);
        const map = {};
        for (const v of rows) {
          try {
            const p = await propertyService.getPropertyById(v.propertyId);
            if (p) map[v.propertyId] = p.titleEn;
          } catch {
            // ignore property lookup failures
          }
        }
        setTitles(map);
      })
      .catch(() => setVisits([]));
  }

  useEffect(load, [user]);

  async function handleAction(action, ...args) {
    try {
      await action(...args);
      toast.success(t('toast.assignmentUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  async function handleOutcome(id, outcome) {
    await handleAction(visitService.recordOutcome, user, id, outcome);
  }

  async function handleNote(id) {
    const note = noteDrafts[id];
    if (!note) return;
    await handleAction(visitService.addVisitNote, user, id, note);
    setNoteDrafts((d) => ({ ...d, [id]: '' }));
  }

  if (visits === null) return null;
  if (visits.length === 0) return <EmptyState titleKey="empty.noData" icon={CalendarCheck} />;

  return (
    <div className="space-y-3">
      {visits.map((v) => (
        <div key={v.id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-800">{titles[v.propertyId] || v.propertyId}</p>
              <p className="text-sm text-gray-500">{v.buyerName} &middot; {new Date(v.scheduledFor).toLocaleString()}</p>
              {v.meetingLocation && <p className="text-xs text-gray-400">{v.meetingLocation}</p>}
            </div>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{t(`visit.status.${v.status}`)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleAction(visitService.confirmVisit, user, v.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
              {t('visit.confirm')}
            </button>
            <button type="button" onClick={() => handleAction(visitService.markCompleted, user, v.id)} className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
              {t('visit.markCompleted')}
            </button>
            <button type="button" onClick={() => handleAction(visitService.markCancelled, user, v.id, '')} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
              {t('visit.markCancelled')}
            </button>
            <button type="button" onClick={() => handleAction(visitService.markNoShow, user, v.id, '')} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
              {t('visit.markNoShow')}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor={`outcome-${v.id}`} className="text-xs font-medium text-gray-600">{t('visit.outcome')}</label>
            <select
              id={`outcome-${v.id}`}
              value={v.outcome || ''}
              onChange={(e) => handleOutcome(v.id, e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
            >
              <option value="">-</option>
              {OUTCOMES.map((o) => <option key={o} value={o}>{t(`visit.outcomeOptions.${o}`)}</option>)}
            </select>
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={noteDrafts[v.id] || ''}
              onChange={(e) => setNoteDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
              placeholder={t('visit.notePlaceholder')}
              className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
            />
            <button type="button" onClick={() => handleNote(v.id)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-warm-white">
              {t('visit.addNote')}
            </button>
          </div>
          {v.notes && <p className="mt-2 text-xs text-gray-500">{v.notes}</p>}
        </div>
      ))}
    </div>
  );
}
