import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { followUpService, isOverdue } from '../../services/followUpService';
import { assignmentService } from '../../services/assignmentService';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import AssignmentModal from '../../components/dashboard/AssignmentModal';
import { useClientPagination } from '../../hooks/useClientPagination';

const PRIORITIES = ['low', 'medium', 'high'];

export default function FollowUps() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [followUps, setFollowUps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [modalRecord, setModalRecord] = useState(null);

  function load() {
    followUpService.getAllFollowUps().then(setFollowUps);
    userService.getUsers({ role: 'employee', status: 'approved' }).then(setEmployees);
  }

  useEffect(load, []);

  const employeeName = (id) => employees.find((e) => e.id === id)?.name;

  const filtered = followUps.filter((f) => {
    if (unassignedOnly && f.assignedEmployeeId) return false;
    if (!unassignedOnly && employeeFilter && f.assignedEmployeeId !== employeeFilter) return false;
    if (priorityFilter && f.priority !== priorityFilter) return false;
    if (dueDateFilter && f.dueDate.slice(0, 10) !== dueDateFilter) return false;
    return true;
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
  } = useClientPagination(filtered, 10);

  useEffect(() => {
    setPage(1);
  }, [employeeFilter, priorityFilter, dueDateFilter, unassignedOnly, setPage]);

  async function handleAssign({ employeeId, note, dueAt }) {
    try {
      await assignmentService.assign(user, 'followUp', modalRecord.id, employeeId, {
        assignmentNote: note || undefined,
        assignmentDueAt: dueAt || undefined,
      });
      toast.success(t(modalRecord.assignedEmployeeId ? 'toast.reassignmentSuccess' : 'toast.assignmentSuccess', { ns: 'dashboard' }));
      setModalRecord(null);
      load();
    } catch (err) {
      toast.error(t(err.message, { ns: 'dashboard' }));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="fu-employee-filter" className="mb-1 block text-xs font-medium text-gray-600">
            {t('filters.employee', { ns: 'dashboard' })}
          </label>
          <select
            id="fu-employee-filter"
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value);
              setUnassignedOnly(false);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t('filters.all', { ns: 'dashboard' })}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fu-priority-filter" className="mb-1 block text-xs font-medium text-gray-600">
            {t('filters.priority', { ns: 'dashboard' })}
          </label>
          <select
            id="fu-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t('filters.all', { ns: 'dashboard' })}</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{t(`priority.${p}`, { ns: 'dashboard' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fu-due-filter" className="mb-1 block text-xs font-medium text-gray-600">
            {t('filters.dueDate', { ns: 'dashboard' })}
          </label>
          <input
            id="fu-due-filter"
            type="date"
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 pb-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={unassignedOnly}
            onChange={(e) => {
              setUnassignedOnly(e.target.checked);
              if (e.target.checked) setEmployeeFilter('');
            }}
          />
          {t('filters.unassignedOnly', { ns: 'dashboard' })}
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t('table.details', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('table.record', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('filters.priority', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('assignment.assignedDate', { ns: 'dashboard' })} / {t('filters.dueDate', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('table.status', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('table.assignedEmployee', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('assignment.assignmentStatus', { ns: 'dashboard' })}</th>
                  <th className="px-4 py-3">{t('table.actions', { ns: 'dashboard' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">{f.reason}</td>
                    <td className="px-4 py-3">
                      {t(`followUpRecordType.${f.recordType}`, { ns: 'dashboard' })} &middot; {f.recordId}
                    </td>
                    <td className="px-4 py-3 capitalize">{t(`priority.${f.priority}`, { ns: 'dashboard' })}</td>
                    <td className="px-4 py-3">
                      {f.dueDate.slice(0, 10)} {f.dueTime}
                      {isOverdue(f) && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">{t('filters.overdue', { ns: 'dashboard' })}</span>}
                    </td>
                    <td className="px-4 py-3">{t(`followUpStatus.${f.status}`, { ns: 'dashboard' })}</td>
                    <td className="px-4 py-3">
                      {f.assignedEmployeeId ? employeeName(f.assignedEmployeeId) || f.assignedEmployeeId : t('assignment.unassigned', { ns: 'dashboard' })}
                    </td>
                    <td className="px-4 py-3 capitalize">{f.assignmentStatus || 'unassigned'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setModalRecord(f)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                      >
                        {f.assignedEmployeeId ? t('assignment.reassignEmployee', { ns: 'dashboard' }) : t('assignment.assignEmployee', { ns: 'dashboard' })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      <AssignmentModal
        open={Boolean(modalRecord)}
        onClose={() => setModalRecord(null)}
        employees={employees}
        record={modalRecord}
        isReassign={Boolean(modalRecord?.assignedEmployeeId)}
        onSubmit={handleAssign}
      />
    </div>
  );
}
