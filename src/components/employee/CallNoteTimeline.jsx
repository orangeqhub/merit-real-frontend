import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { callNoteService } from '../../services/callNoteService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

const RESULTS = ['connected', 'no_answer', 'busy', 'switched_off', 'invalid_number', 'call_back_requested'];
const INTEREST_LEVELS = ['low', 'medium', 'high'];

function emptyForm() {
  return {
    direction: 'outgoing',
    result: 'connected',
    summary: '',
    interestLevel: 'medium',
    nextAction: '',
    nextFollowUpAt: '',
  };
}

export default function CallNoteTimeline({ enquiryId }) {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    if (!enquiryId) return;
    callNoteService.getForEnquiry(enquiryId).then(setNotes).catch(() => setNotes([]));
  }

  useEffect(load, [enquiryId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await callNoteService.addCallNote(user, {
        enquiryId,
        callDateTime: new Date().toISOString(),
        ...form,
        nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : null,
      });
      toast.success(t('callNote.save'));
      setForm(emptyForm());
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(t(err.message, { defaultValue: err.message }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-800">{t('callNote.title')}</h3>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-warm-white">
          {t('callNote.addCallNote')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-dashed border-brand-300 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
              <option value="incoming">{t('callNote.direction.incoming')}</option>
              <option value="outgoing">{t('callNote.direction.outgoing')}</option>
            </select>
            <select value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
              {RESULTS.map((r) => <option key={r} value={r}>{t(`callNote.result.${r}`)}</option>)}
            </select>
          </div>
          <textarea
            required
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder={t('callNote.summaryPlaceholder')}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.interestLevel} onChange={(e) => setForm((f) => ({ ...f, interestLevel: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs">
              {INTEREST_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{t(`callNote.interest.${lvl}`)}</option>)}
            </select>
            <input
              type="datetime-local"
              value={form.nextFollowUpAt}
              onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
            />
          </div>
          <input
            value={form.nextAction}
            onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))}
            placeholder={t('callNote.nextActionPlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
          />
          <button type="submit" disabled={saving} className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-warm-white disabled:opacity-50">
            {t('callNote.save')}
          </button>
        </form>
      )}

      <ul className="mt-3 space-y-2">
        {notes.length === 0 && <p className="text-xs text-gray-400">{t('callNote.empty')}</p>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-gray-200 p-2.5 text-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              {n.direction === 'incoming' ? <PhoneIncoming size={13} /> : <PhoneOutgoing size={13} />}
              {t(`callNote.direction.${n.direction}`)} &middot; {t(`callNote.result.${n.result}`)}
              <span className="ml-auto text-gray-400">{new Date(n.callDateTime).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-gray-700">{n.summary}</p>
            <p className="mt-1 text-xs text-gray-500">
              {t('callNote.interestLabel')}: {t(`callNote.interest.${n.interestLevel}`)}
              {n.nextAction && ` · ${t('callNote.nextActionLabel')}: ${n.nextAction}`}
            </p>
            {n.nextFollowUpAt && (
              <p className="text-xs text-brand-700">{t('callNote.nextFollowUpLabel')}: {new Date(n.nextFollowUpAt).toLocaleString()}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
