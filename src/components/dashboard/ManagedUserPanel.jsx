import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye, Pencil, Plus, Trash2, X, Search } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from '../common/EmptyState';
import TablePagination from '../common/TablePagination';
import TableActionsMenu from '../common/TableActionsMenu';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import { exportSingleSheetXlsx } from '../../utils/xlsxExport';
import { AGENT_GRADES } from '../../config/agentGrades';

const PROPERTY_TYPES = [
  'Residential Plot / Open Land',
  'Apartment / Flat',
  'Villa / Independent House',
  'Commercial Property',
  'Agricultural Land',
  'Industrial Land',
  'Other',
];

const EMPTY_FORM = {
  name: '',
  mobile: '',
  email: '',
  password: '',
  district: '',
  city: '',
  address: '',
  preferredPropertyType: '',
  occupation: '',
  agentGrade: '',
  score: '',
  status: 'approved',
};

function registrationStatusLabel(status) {
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  if (status === 'inactive') return 'Inactive';
  return 'Registered';
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{value || '—'}</dd>
    </div>
  );
}

/**
 * Shared Customer / Agent / Sales Member management table with CRUD.
 * @param {'customer'|'agent'|'sales_member'} mode
 * @param {{ list, create, update, remove }} service
 */
export default function ManagedUserPanel({ mode, service }) {
  const { t } = useTranslation(['dashboard', 'common', 'forms']);
  const isAgent = mode === 'agent';
  const isSales = mode === 'sales_member';
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const title = isSales
    ? t('admin.salesMemberManagement', { defaultValue: 'Sales Members' })
    : isAgent
      ? t('admin.agentManagement', { defaultValue: 'Agent Management' })
      : t('admin.customerManagement', { defaultValue: 'Customer Management' });

  const newButtonLabel = isSales
    ? t('admin.newSalesMember', { defaultValue: 'New Sales Member' })
    : isAgent
      ? t('admin.newAgentRegistration', { defaultValue: 'New Agent Registration' })
      : t('admin.newCustomerRegistration', { defaultValue: 'New Customer Registration' });

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await service.list({
        page: nextPage,
        pageSize,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        sortBy: 'createdAt',
        sortDir: 'DESC',
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Failed to load records');
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
    setForm({ ...EMPTY_FORM, status: 'approved', agentGrade: isAgent ? '' : undefined });
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
      district: row.district || '',
      city: row.city || '',
      address: row.address || '',
      preferredPropertyType: row.preferredPropertyType || '',
      occupation: row.occupation || '',
      agentGrade: row.agentGrade || '',
      score: row.score != null ? String(row.score) : '',
      status: row.status || 'approved',
    });
    setModal('edit');
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
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
        district: form.district || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        occupation: form.occupation?.trim() || undefined,
        status: form.status,
      };

      if (modal === 'create') {
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      if (!isAgent && !isSales) {
        payload.preferredPropertyType = form.preferredPropertyType;
      } else if (isAgent) {
        payload.agentGrade = form.agentGrade || undefined;
        payload.score = form.score === '' ? null : Number(form.score);
      }

      if (modal === 'create') {
        await service.create(payload);
        toast.success(
          isAgent
            ? t('toast.agentCreated', { defaultValue: 'Agent created successfully.' })
            : t('toast.customerCreated', { defaultValue: 'Customer created successfully.' })
        );
      } else {
        await service.update(selected.id, payload);
        toast.success(
          isAgent
            ? t('toast.agentUpdated', { defaultValue: 'Agent updated successfully.' })
            : t('toast.customerUpdated', { defaultValue: 'Customer updated successfully.' })
        );
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
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await service.remove(row.id);
      toast.success(
        isSales
          ? t('toast.salesMemberDeleted', { defaultValue: 'Sales member deleted.' })
          : isAgent
            ? t('toast.agentDeleted', { defaultValue: 'Agent deleted.' })
            : t('toast.customerDeleted', { defaultValue: 'Customer deleted.' })
      );
      load(page);
    } catch (err) {
      toast.error(err.message || 'Failed to delete user.');
    }
  }

  function handleExport() {
    if (rows.length === 0) {
      toast.info(t('toast.exportEmpty'));
      return;
    }
    const columns = [
      { header: isSales ? 'Employee ID' : (isAgent ? 'Agent ID' : 'Customer ID'), value: (r) => r.memberId || r.id },
      { header: 'Name', value: 'name' },
      { header: 'Mobile', value: 'mobile' },
      { header: 'Email', value: 'email' },
      ...(isSales
        ? []
        : isAgent
          ? [{ header: 'Grade', value: (r) => r.agentGradeLabel || r.agentGrade || '-' }]
          : [{ header: 'Preferred Property Type', value: (r) => r.preferredPropertyType || '-' }]),
      { header: 'Status', value: 'status' },
      { header: 'Registered', value: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : '-') },
    ];
    exportSingleSheetXlsx(
      `${isSales ? 'sales-members' : isAgent ? 'agents' : 'customers'}-export.xlsx`,
      title,
      rows,
      columns
    );
    toast.success(t('toast.exportSuccess'));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSales
              ? t('admin.salesMemberManagementHint', { defaultValue: 'Manage approved sales members.' })
              : isAgent
                ? t('admin.agentManagementHint', { defaultValue: 'Manage registered agents and assigned grades.' })
                : t('admin.customerManagementHint', { defaultValue: 'Manage registered customers and their details.' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700"
          >
            <Download size={16} /> {t('export.exportToExcel')}
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
          >
            <Plus size={16} /> {newButtonLabel}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(1); }}
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
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
                  <th className="px-4 py-3">{isSales ? 'Employee ID' : (isAgent ? 'Agent ID' : 'Customer ID')}</th>
                  <th className="px-4 py-3">{t('table.name')}</th>
                  <th className="px-4 py-3">{t('table.mobile')}</th>
                  <th className="px-4 py-3">{t('table.email')}</th>
                  {!isSales && (
                    <th className="px-4 py-3">{isAgent ? 'Assigned Grade' : 'Preferred Property Type'}</th>
                  )}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registration Date</th>
                  <th className="px-4 py-3">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.memberId || u.id}</td>
                    <td className="px-4 py-3 text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-700">{u.mobile}</td>
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    {!isSales && (
                      <td className="px-4 py-3 text-gray-700">
                        {isAgent
                          ? (u.agentGradeLabel || u.agentGrade || '—')
                          : (u.preferredPropertyType || '—')}
                      </td>
                    )}
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TableActionsMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View',
                            icon: Eye,
                            onClick: () => openView(u),
                          },
                          {
                            key: 'edit',
                            label: 'Edit',
                            icon: Pencil,
                            onClick: () => openEdit(u),
                          },
                          {
                            key: 'activate',
                            label: 'Activate',
                            hidden: u.status === 'approved',
                            onClick: async () => {
                              try {
                                await service.update(u.id, { status: 'approved' });
                                toast.success('User activated.');
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
                                await service.update(u.id, { status: 'inactive' });
                                toast.success('User deactivated.');
                                load(page);
                              } catch (err) {
                                toast.error(err.message);
                              }
                            },
                          },
                          {
                            key: 'delete',
                            label: 'Delete',
                            icon: Trash2,
                            tone: 'danger',
                            onClick: () => handleDelete(u),
                          },
                        ]}
                      />
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-warm-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-warm-white px-5 py-4">
              <h2 className="text-lg font-semibold text-brand-800">
                {modal === 'create' ? newButtonLabel : t('buttons.edit', { ns: 'common' })}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.fullName', { ns: 'forms' })}</label>
                  <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.mobile', { ns: 'forms' })}</label>
                  <input required inputMode="numeric" value={form.mobile} onChange={(e) => updateField('mobile', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.email', { ns: 'forms' })}</label>
                  <input required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.password', { ns: 'forms' })}
                    {modal === 'edit' ? ' (optional)' : ''}
                  </label>
                  <input
                    type="password"
                    required={modal === 'create'}
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('table.status')}</label>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.district', { ns: 'forms' })}</label>
                  <input type="text" value={form.district} onChange={(e) => updateField('district', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.city', { ns: 'forms' })}</label>
                  <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.address', { ns: 'forms' })}</label>
                  <textarea rows={2} value={form.address} onChange={(e) => updateField('address', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.occupation', { ns: 'forms', defaultValue: 'Occupation' })}
                    <span className="text-red-500"> *</span>
                  </label>
                  <input
                    required
                    value={form.occupation}
                    onChange={(e) => updateField('occupation', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                {!isAgent && !isSales && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.preferredPropertyType', { ns: 'forms' })}</label>
                    <select
                      required={modal === 'create'}
                      value={form.preferredPropertyType}
                      onChange={(e) => updateField('preferredPropertyType', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    >
                      <option value="">-- Select --</option>
                      {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
                {isAgent && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {t('registration.agentGrade', { ns: 'forms', defaultValue: 'Assigned Grade' })}
                        {form.status === 'approved' ? ' *' : ''}
                      </label>
                      <select
                        required={form.status === 'approved'}
                        value={form.agentGrade}
                        onChange={(e) => updateField('agentGrade', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">-- Select Grade --</option>
                        {AGENT_GRADES.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Score
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.score}
                        onChange={(e) => updateField('score', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                        placeholder="Employee / agent score (Omkareshwar-style)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Optional performance score used for employee/agent tracking (aligned with Omkareshwar plot staff details).
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50">
                  {saving ? 'Saving...' : t('buttons.save', { ns: 'common' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'view' && selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-warm-white shadow-xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-gray-100 bg-warm-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-brand-800">{selected.name}</h2>
                <div className="mt-1"><StatusBadge status={selected.status} /></div>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow label={isAgent ? 'Agent ID' : 'Customer ID'} value={selected.memberId || selected.id} />
                <DetailRow label={t('table.mobile')} value={selected.mobile} />
                <DetailRow label={t('table.email')} value={selected.email} />
                <DetailRow label="Registration Status" value={registrationStatusLabel(selected.status)} />
                <DetailRow label={t('table.location')} value={[selected.city, selected.district].filter(Boolean).join(', ')} />
                <DetailRow label="Registration Date" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : null} />
                <div className="sm:col-span-2">
                  <DetailRow label={t('registration.address', { ns: 'forms' })} value={selected.address} />
                </div>
                <DetailRow
                  label={t('registration.occupation', { ns: 'forms', defaultValue: 'Occupation' })}
                  value={selected.occupation}
                />
                {!isAgent && !isSales && (
                  <DetailRow label={t('registration.preferredPropertyType', { ns: 'forms' })} value={selected.preferredPropertyType} />
                )}
                {isAgent && (
                  <>
                    <DetailRow label="Assigned Grade" value={selected.agentGradeLabel || selected.agentGrade} />
                    <DetailRow label="Score" value={selected.score != null ? selected.score : null} />
                  </>
                )}
              </dl>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => openEdit(selected)} className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800">
                  {t('buttons.edit', { ns: 'common' })}
                </button>
                <button type="button" onClick={closeModal} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">
                  {t('buttons.close', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
