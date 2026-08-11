import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../../services/propertyService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import EmptyState from '../common/EmptyState';
import StatusBadge from './StatusBadge';

export default function PropertyModerationList({ statusFilter = 'draft', scoped = false }) {
  const { t } = useTranslation(['common', 'dashboard']);
  const { user } = useAuthStore();
  const [properties, setProperties] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState('');

  function load() {
    const params = { status: statusFilter, includeAllStatuses: true, admin: true, pageSize: 100 };
    if (scoped) {
      params.viewer = user;
      params.scopeMode = 'employee';
    }
    propertyService.getProperties(params).then((r) => setProperties(r.items));
    if (user?.role === 'admin') {
      userService.getUsers({ role: 'employee', status: 'approved' }).then(setEmployees);
    }
  }

  useEffect(load, [statusFilter, scoped, user]);

  async function handleAction(id, action, actionNote) {
    await propertyService.moderate(id, action, actionNote);
    toast.success(t('toast.propertyUpdated', { ns: 'dashboard' }));
    setNoteFor(null);
    setNote('');
    load();
  }

  async function handleAssign(id, employeeId) {
    await propertyService.assignRecord(id, { assignedEmployeeId: employeeId || null, assignedBy: user.id });
    toast.success(t('toast.assignmentUpdated', { ns: 'dashboard' }));
    load();
  }

  if (properties === null) return null;
  if (properties.length === 0) return <EmptyState titleKey="empty.noData" />;

  return (
    <div className="space-y-3">
      {properties.map((p) => {
        const assignedEmployee = employees.find((e) => e.id === p.assignedEmployeeId);
        return (
          <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to={`/properties/${p.id}`} className="font-medium text-brand-800 hover:underline">{p.titleEn}</Link>
              <p className="text-sm text-gray-500">{p.locationEn} &middot; ₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
              <div className="mt-1"><StatusBadge status={p.status} /></div>
              <p className="mt-1 text-xs font-medium text-brand-700">
                {p.assignedEmployeeId
                  ? t('assignment.assignedTo', { ns: 'dashboard', name: assignedEmployee?.name || p.assignedEmployeeId })
                  : t('assignment.unassigned', { ns: 'dashboard' })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user?.role === 'admin' && (
                <select
                  aria-label={t('assignment.assignEmployee', { ns: 'dashboard' })}
                  value={p.assignedEmployeeId || ''}
                  onChange={(e) => handleAssign(p.id, e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">{t('assignment.unassigned', { ns: 'dashboard' })}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}
              <button type="button" onClick={() => handleAction(p.id, 'approve')} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-warm-white">
                {t('buttons.approve')}
              </button>
              <button type="button" onClick={() => setNoteFor({ id: p.id, action: 'requestChanges' })} className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700">
                {t('modal.requestedChanges', { ns: 'dashboard' })}
              </button>
              <button type="button" onClick={() => setNoteFor({ id: p.id, action: 'reject' })} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600">
                {t('buttons.reject')}
              </button>
            </div>
          </div>
        );
      })}

      {noteFor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="font-semibold text-brand-800">
              {noteFor.action === 'reject' ? t('modal.rejectionReason', { ns: 'dashboard' }) : t('modal.requestedChanges', { ns: 'dashboard' })}
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={noteFor.action === 'reject' ? t('modal.rejectionReasonPlaceholder', { ns: 'dashboard' }) : t('modal.requestedChangesPlaceholder', { ns: 'dashboard' })}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setNoteFor(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                {t('buttons.cancel')}
              </button>
              <button type="button" onClick={() => handleAction(noteFor.id, noteFor.action, note)} disabled={!note} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-warm-white disabled:opacity-50">
                {t('modal.submit', { ns: 'dashboard' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
