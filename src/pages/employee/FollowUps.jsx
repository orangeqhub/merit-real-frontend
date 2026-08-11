import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { followUpService, isOverdue } from '../../services/followUpService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';

const TABS = ['today', 'upcoming', 'overdue', 'completed', 'cancelled'];

function isToday(f) {
  const due = new Date(`${f.dueDate.slice(0, 10)}T${f.dueTime || '00:00'}:00`);
  const now = new Date();
  return due.toDateString() === now.toDateString();
}

export default function FollowUps() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'today');
  const [followUps, setFollowUps] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [rescheduleDrafts, setRescheduleDrafts] = useState({});

  function load() {
    if (user) followUpService.getAssignedFollowUps(user).then(setFollowUps);
  }

  useEffect(load, [user]);

  const filtered = useMemo(() => {
    if (!followUps) return [];
    return followUps.filter((f) => {
      if (tab === 'today') return isToday(f) && f.status !== 'completed' && f.status !== 'cancelled';
      if (tab === 'upcoming') return !isOverdue(f) && !isToday(f) && f.status !== 'completed' && f.status !== 'cancelled';
      if (tab === 'overdue') return isOverdue(f);
      if (tab === 'completed') return f.status === 'completed';
      if (tab === 'cancelled') return f.status === 'cancelled';
      return true;
    });
  }, [followUps, tab]);

  async function run(action, ...args) {
    try {
      await action(user, ...args);
      toast.success(t('toast.assignmentUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  async function handleReschedule(id) {
    const draft = rescheduleDrafts[id];
    if (!draft) return;
    await run(followUpService.reschedule, id, draft.slice(0, 10), draft.slice(11, 16));
    setRescheduleDrafts((d) => ({ ...d, [id]: '' }));
  }

  async function handleAddNote(id) {
    const note = noteDrafts[id];
    if (!note) return;
    await run(followUpService.addNote, id, note);
    setNoteDrafts((d) => ({ ...d, [id]: '' }));
  }

  if (followUps === null) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`rounded-full border px-3 py-1.5 text-sm ${tab === tabKey ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
          >
            {t(`followUpTabs.${tabKey}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{f.reason}</p>
                  <p className="text-xs text-gray-400">
                    {t(`followUpRecordType.${f.recordType}`)} &middot; {f.dueDate.slice(0, 10)} {f.dueTime}
                  </p>
                  {f.nextAction && <p className="mt-1 text-xs text-gray-500">{f.nextAction}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{t(`followUpStatus.${f.status}`)}</span>
                  {isOverdue(f) && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{t('filters.overdue')}</span>}
                  <span className="text-xs capitalize text-gray-400">{t(`priority.${f.priority}`)}</span>
                </div>
              </div>

              {f.status !== 'completed' && f.status !== 'cancelled' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => run(followUpService.start, f.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    {t('followUpActions.start')}
                  </button>
                  <button type="button" onClick={() => run(followUpService.complete, f.id, '')} className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
                    {t('followUpActions.complete')}
                  </button>
                  <button type="button" onClick={() => run(followUpService.cancel, f.id, '')} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                    {t('followUpActions.cancel')}
                  </button>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="datetime-local"
                  value={rescheduleDrafts[f.id] || ''}
                  onChange={(e) => setRescheduleDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
                <button type="button" onClick={() => handleReschedule(f.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  {t('followUpActions.reschedule')}
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={noteDrafts[f.id] || ''}
                  onChange={(e) => setNoteDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                  placeholder={t('followUpActions.notePlaceholder')}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
                <button type="button" onClick={() => handleAddNote(f.id)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-warm-white">
                  {t('followUpActions.addNote')}
                </button>
              </div>
              {f.completionNote && <p className="mt-2 text-xs text-gray-500">{f.completionNote}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
