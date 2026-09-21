import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { internalNoteService } from '../../services/internalNoteService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

export default function InternalNotesPanel({ recordType, recordId }) {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');

  function load() {
    internalNoteService.getForRecord(user, recordType, recordId).then(setNotes).catch(() => setNotes([]));
  }

  useEffect(load, [recordType, recordId, user]);

  async function handleAdd() {
    if (!text.trim()) return;
    try {
      await internalNoteService.addNote(user, { recordType, recordId, text: text.trim() });
      toast.success(t('internalNote.add'));
      setText('');
      load();
    } catch (err) {
      toast.error(t(err.message, { defaultValue: err.message }));
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-800">{t('internalNote.title')}</h3>
      <div className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('internalNote.placeholder')}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={handleAdd} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-warm-white">
          {t('internalNote.add')}
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {notes.length === 0 && <p className="text-xs text-gray-400">{t('internalNote.empty')}</p>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
            <p className="text-gray-700">{n.text}</p>
            <p className="mt-1 text-xs text-gray-400">{n.employeeName} &middot; {new Date(n.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
