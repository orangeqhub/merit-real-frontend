import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export default function ScheduleVisitModal({ open, onClose, onConfirm }) {
  const { t } = useTranslation('common');
  const [date, setDate] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-warm-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">{t('buttons.scheduleVisit')}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <label htmlFor="visit-date" className="mb-1.5 mt-4 block text-sm font-medium text-gray-700">
          Preferred date and time
        </label>
        <input
          id="visit-date"
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">
            {t('buttons.cancel')}
          </button>
          <button
            type="button"
            disabled={!date}
            onClick={() => onConfirm(date)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-warm-white disabled:opacity-50"
          >
            {t('buttons.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
