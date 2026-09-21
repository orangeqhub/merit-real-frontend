import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Pencil, Plus, Shield, Trash2, X, Search } from 'lucide-react';
import StatusBadge from '../../components/dashboard/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import EmployeePermissionsGrid from '../../components/dashboard/EmployeePermissionsGrid';
import EmployeePermissionsModal from '../../components/dashboard/EmployeePermissionsModal';
import { employeeService } from '../../services/employeeService';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import { ASSIGNABLE_EMPLOYEE_PERMISSIONS } from '../../config/employeePermissions';

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  password: '',
  status: 'approved',
  permissions: [...ASSIGNABLE_EMPLOYEE_PERMISSIONS],
};

export default function Employees() {
  const { t } = useTranslation(['dashboard', 'common', 'forms']);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'view'
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await employeeService.list({
        page: nextPage,
        pageSize,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Failed to load employees');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pageSize]);

  function openCreate() {
    setSelected(null);
    setForm({ ...EMPTY_FORM, permissions: [...ASSIGNABLE_EMPLOYEE_PERMISSIONS] });
    setShowPassword(false);
    setModal('create');
  }

  function openView(row) {
    setSelected(row);
    setModal('view');
  }

  function openEdit(row) {
    setSelected(row);
    setForm({
      name: row.name || '',
      mobile: row.mobile || '',
      email: row.email || '',
      password: '',
      status: row.status || 'approved',
      permissions: Array.isArray(row.permissions) ? [...row.permissions] : [],
    });
    setShowPassword(false);
    setModal('edit');
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        status: form.status,
        permissions: form.permissions,
      };

      if (modal === 'create') {
        payload.password = form.password;
        await employeeService.create(payload);
        toast.success(t('toast.employeeAdded'));
      } else {
        payload.password = form.password;
        await employeeService.update(selected.id, payload);
        toast.success(t('toast.employeeUpdated', { defaultValue: 'Employee updated successfully.' }));
      }

      closeModal();
      load(modal === 'create' ? 1 : page);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: t('admin.confirmDeleteUserTitle', { defaultValue: 'Delete user?' }),
      message: t('admin.confirmDeleteUser', {
        defaultValue: 'Delete {{name}}? This cannot be undone.',
        name: row.name,
      }),
      confirmLabel: t('buttons.delete', { ns: 'common' }),
      cancelLabel: t('buttons.cancel', { ns: 'common' }),
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await employeeService.remove(row.id);
      toast.success(t('toast.employeeDeleted', { defaultValue: 'Employee deleted.' }));
      load(page);
    } catch (err) {
      toast.error(err.message || 'Failed to delete employee.');
    }
  }

  async function handleSavePermissions(permissions) {
    if (!permissionsTarget) return;
    setSaving(true);
    try {
      await employeeService.updatePermissions(permissionsTarget.id, permissions);
      toast.success(t('toast.permissionsUpdated', { defaultValue: 'Permissions updated.' }));
      setPermissionsTarget(null);
      load(page);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">
            {t('admin.employeeManagement', { defaultValue: 'Employee Management' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('admin.employeeManagementHint', {
              defaultValue: 'Create employees and assign module permissions.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
        >
          <Plus size={16} /> {t('admin.addEmployee')}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load(1);
            }}
            placeholder={t('filters.search', { defaultValue: 'Search' })}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t('filters.all', { defaultValue: 'All statuses' })}</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => load(1)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {t('buttons.search', { ns: 'common' })}
        </button>
      </div>

      {loading ? null : rows.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3">{t('table.name')}</th>
                  <th className="px-4 py-3">{t('table.mobile')}</th>
                  <th className="px-4 py-3">{t('table.email')}</th>
                  <th className="px-4 py-3">{t('employeePermissions.manage')}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((u) => {
                  const permCount = Array.isArray(u.permissions) ? u.permissions.length : 0;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.memberId || u.id}</td>
                      <td className="px-4 py-3 text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-700">{u.mobile}</td>
                      <td className="px-4 py-3 text-gray-700">{u.email}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <button
                          type="button"
                          onClick={() => setPermissionsTarget(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-gray-50"
                        >
                          <Shield size={14} />
                          {permCount} {t('employeePermissions.assigned')}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3">
                        <TableActionsMenu
                          items={[
                            {
                              key: 'view',
                              label: t('buttons.view', { ns: 'common' }),
                              icon: Eye,
                              onClick: () => openView(u),
                            },
                            {
                              key: 'edit',
                              label: t('buttons.edit', { ns: 'common' }),
                              icon: Pencil,
                              onClick: () => openEdit(u),
                            },
                            {
                              key: 'permissions',
                              label: t('employeePermissions.manage'),
                              icon: Shield,
                              onClick: () => setPermissionsTarget(u),
                            },
                            {
                              key: 'activate',
                              label: 'Activate',
                              hidden: u.status === 'approved',
                              onClick: async () => {
                                try {
                                  await employeeService.update(u.id, { status: 'approved' });
                                  toast.success('Employee activated.');
                                  load(page);
                                } catch (err) {
                                  toast.error(err.message);
                                }
                              },
                            },
                            {
                              key: 'deactivate',
                              label: 'Deactivate',
                              hidden: u.status === 'inactive',
                              onClick: async () => {
                                try {
                                  await employeeService.update(u.id, { status: 'inactive' });
                                  toast.success('Employee deactivated.');
                                  load(page);
                                } catch (err) {
                                  toast.error(err.message);
                                }
                              },
                            },
                            {
                              key: 'delete',
                              label: t('buttons.delete', { ns: 'common' }),
                              icon: Trash2,
                              tone: 'danger',
                              onClick: () => handleDelete(u),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={(next) => load(next)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}

      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-warm-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-warm-white px-5 py-4">
              <h2 className="text-lg font-semibold text-brand-800">
                {modal === 'create' ? t('admin.addEmployee') : t('buttons.edit', { ns: 'common' })}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.fullName', { ns: 'forms' })}
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.mobile', { ns: 'forms' })}
                  </label>
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    title="Enter a 10-digit mobile number"
                    value={form.mobile}
                    onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.email', { ns: 'forms' })}
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.password', { ns: 'forms' })}
                    <span className="text-red-500"> *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-10 text-sm"
                      placeholder="Enter password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('table.status')}</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {t('employeePermissions.manage')}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {form.permissions.length} / {ASSIGNABLE_EMPLOYEE_PERMISSIONS.length}{' '}
                    {t('employeePermissions.assigned')}
                  </span>
                </div>
                <EmployeePermissionsGrid
                  selected={form.permissions}
                  onChange={(permissions) => updateField('permissions', permissions)}
                  disabled={saving}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {t('buttons.save', { ns: 'common' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'view' && selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-warm-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-warm-white px-5 py-4">
              <h2 className="text-lg font-semibold text-brand-800">{selected.name}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Employee ID</dt>
                  <dd className="mt-0.5 text-sm text-gray-800">{selected.memberId || selected.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t('table.status')}</dt>
                  <dd className="mt-0.5">
                    <StatusBadge status={selected.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('registration.mobile', { ns: 'forms' })}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-800">{selected.mobile || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('registration.email', { ns: 'forms' })}
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-800">{selected.email || '—'}</dd>
                </div>
              </dl>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">{t('employeePermissions.manage')}</h3>
                <EmployeePermissionsGrid
                  selected={selected.permissions || []}
                  onChange={() => {}}
                  disabled
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                >
                  {t('buttons.close', { ns: 'common' })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    openEdit(selected);
                  }}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white"
                >
                  {t('buttons.edit', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EmployeePermissionsModal
        open={Boolean(permissionsTarget)}
        employeeName={permissionsTarget?.name}
        permissions={permissionsTarget?.permissions || []}
        saving={saving}
        onClose={() => {
          if (!saving) setPermissionsTarget(null);
        }}
        onSave={handleSavePermissions}
      />
    </div>
  );
}
