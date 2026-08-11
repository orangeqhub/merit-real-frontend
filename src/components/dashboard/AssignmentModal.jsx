import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Shared assign/reassign dialog used by both admin Visits and admin
 * Follow-ups pages. Only ever offers employees the caller already filtered
 * to active ('approved') accounts — this component doesn't re-check status,
 * it trusts the `employees` list it's given.
 */
export default function AssignmentModal({ open, onClose, employees, record, onSubmit, isReassign }) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [employeeId, setEmployeeId] = useState('');
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeId(record?.assignedEmployeeId || '');
      setNote('');
      setDueAt('');
      setSubmitting(false);
    }
  }, [open, record]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeId) return;
    setSubmitting(true);
    try {
      await onSubmit({ employeeId, note, dueAt });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          {isReassign ? t('assignment.reassignEmployee', { ns: 'dashboard' }) : t('assignment.assignEmployee', { ns: 'dashboard' })}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="assignment-employee" className="mb-1 block text-sm text-gray-600">
              {t('assignment.selectEmployee', { ns: 'dashboard' })}
            </label>
            <select
              id="assignment-employee"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">{t('assignment.selectEmployee', { ns: 'dashboard' })}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            {employees.length === 0 && (
              <p className="mt-1 text-xs text-red-600">{t('assignment.noneAvailable', { ns: 'dashboard' })}</p>
            )}
          </div>
          <div>
            <label htmlFor="assignment-note" className="mb-1 block text-sm text-gray-600">
              {t('assignment.assignmentNote', { ns: 'dashboard' })}
            </label>
            <textarea
              id="assignment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="assignment-due" className="mb-1 block text-sm text-gray-600">
              {t('assignment.dueDateTime', { ns: 'dashboard' })}
            </label>
            <input
              id="assignment-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium">
              {t('common.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={submitting || employees.length === 0}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
            >
              {t('common.save', { ns: 'common' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
