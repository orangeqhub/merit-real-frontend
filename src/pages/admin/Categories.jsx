import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Power, Search,
} from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { useClientPagination } from '../../hooks/useClientPagination';

const AREA_UNITS = ['sqft', 'sqyd', 'acre', 'cent'];
const TRANSACTION_TYPES = ['sale'];

function emptyForm() {
  return {
    slug: '',
    nameEn: '',
    nameTe: '',
    descriptionEn: '',
    descriptionTe: '',
    image: '',
    icon: 'Home',
    transactionTypes: ['sale'],
    areaUnits: ['sqft'],
    propertyFields: '',
    active: true,
    visible: true,
  };
}

export default function Categories() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [categories, setCategories] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    categoryService.getCategories().then(setCategories).catch(() => setCategories([]));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!categories) return [];
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (statusFilter === 'active' && !c.active) return false;
      if (statusFilter === 'inactive' && c.active) return false;
      if (statusFilter === 'visible' && !c.visible) return false;
      if (statusFilter === 'hidden' && c.visible) return false;
      if (!q) return true;
      return (
        c.nameEn?.toLowerCase().includes(q)
        || c.nameTe?.toLowerCase().includes(q)
        || c.slug?.toLowerCase().includes(q)
        || c.groupLabel?.toLowerCase().includes(q)
      );
    });
  }, [categories, search, statusFilter]);

  const {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
  } = useClientPagination(filtered, 10);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, setPage]);

  function openCreate() {
    setForm(emptyForm());
    setEditing('new');
  }

  function openEdit(c) {
    setForm({
      ...emptyForm(),
      ...c,
      transactionTypes: Array.isArray(c.transactionTypes) ? c.transactionTypes : ['sale'],
      areaUnits: Array.isArray(c.areaUnits) ? c.areaUnits : ['sqft'],
      propertyFields: c.propertyFields || '',
      image: c.image || '',
      nameTe: c.nameTe || '',
      descriptionEn: c.descriptionEn || '',
      descriptionTe: c.descriptionTe || '',
    });
    setEditing(c.slug);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editing === 'new') {
        await categoryService.createCategory(form);
        toast.success(t('toast.categoryCreated'));
      } else {
        await categoryService.updateCategory(editing, form);
        toast.success(t('toast.categoryUpdated'));
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message || t('toast.error', { defaultValue: 'Something went wrong' }));
    }
  }

  async function handleToggle(c, field) {
    try {
      await categoryService.updateCategory(c.slug, { [field]: !c[field] });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleReorder(c, direction) {
    try {
      await categoryService.reorder(c.slug, direction);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete() {
    try {
      await categoryService.deleteCategory(deleteTarget.slug);
      toast.success(t('toast.categoryDeleted'));
    } catch (err) {
      toast.error(err.message || t('toast.error', { defaultValue: 'Something went wrong' }));
    }
    setDeleteTarget(null);
    load();
  }

  function toggleListValue(key, value) {
    setForm((f) => {
      const has = f[key].includes(value);
      return { ...f, [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value] };
    });
  }

  if (categories === null) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">{t('category.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage property types, visibility, and display order.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
        >
          <Plus size={16} /> {t('category.addCategory')}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">#</th>
                  <th className="whitespace-nowrap px-4 py-3">Category</th>
                  <th className="whitespace-nowrap px-4 py-3">Slug</th>
                  <th className="whitespace-nowrap px-4 py-3">Group</th>
                  <th className="whitespace-nowrap px-4 py-3">Properties</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Visibility</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((c) => {
                  const globalIndex = categories.findIndex((x) => x.id === c.id);
                  return (
                    <tr key={c.slug} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-600">{c.sortOrder + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {c.image ? (
                            <img src={c.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">
                              {(c.nameEn || '?').slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{c.nameEn}</p>
                            {c.nameTe && <p className="lang-te text-xs text-gray-500">{c.nameTe}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.slug}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-gray-600" title={c.groupLabel || ''}>
                        {c.groupLabel || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{Number(c.propertyCount) || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.active ? t('category.active') : t('category.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.visible ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.visible ? t('category.visible') : t('category.hidden')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <TableActionsMenu
                            items={[
                              {
                                key: 'up',
                                label: t('category.moveUp'),
                                icon: ArrowUp,
                                disabled: globalIndex <= 0,
                                onClick: () => handleReorder(c, 'up'),
                              },
                              {
                                key: 'down',
                                label: t('category.moveDown'),
                                icon: ArrowDown,
                                disabled: globalIndex < 0 || globalIndex >= categories.length - 1,
                                onClick: () => handleReorder(c, 'down'),
                              },
                              {
                                key: 'visibility',
                                label: c.visible ? t('category.hide') : t('category.show'),
                                icon: c.visible ? EyeOff : Eye,
                                onClick: () => handleToggle(c, 'visible'),
                              },
                              {
                                key: 'active',
                                label: c.active ? t('category.deactivate') : t('category.activate'),
                                icon: Power,
                                tone: c.active ? 'success' : 'default',
                                onClick: () => handleToggle(c, 'active'),
                              },
                              {
                                key: 'edit',
                                label: t('category.edit'),
                                icon: Pencil,
                                onClick: () => openEdit(c),
                              },
                              {
                                key: 'delete',
                                label: t('category.delete'),
                                icon: Trash2,
                                tone: 'danger',
                                onClick: () => setDeleteTarget(c),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-8">
          <form onSubmit={handleSubmit} className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="mb-4 font-semibold text-brand-800">
              {editing === 'new' ? t('category.addCategory') : t('category.editCategory')}
            </h2>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-nameEn" className="mb-1 block text-xs font-medium text-gray-600">{t('category.nameEn')}</label>
                  <input id="cat-nameEn" required value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="cat-nameTe" className="mb-1 block text-xs font-medium text-gray-600">{t('category.nameTe')}</label>
                  <input id="cat-nameTe" value={form.nameTe} onChange={(e) => setForm((f) => ({ ...f, nameTe: e.target.value }))} className="lang-te w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-descEn" className="mb-1 block text-xs font-medium text-gray-600">{t('category.descriptionEn')}</label>
                  <textarea id="cat-descEn" rows={2} value={form.descriptionEn} onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="cat-descTe" className="mb-1 block text-xs font-medium text-gray-600">{t('category.descriptionTe')}</label>
                  <textarea id="cat-descTe" rows={2} value={form.descriptionTe} onChange={(e) => setForm((f) => ({ ...f, descriptionTe: e.target.value }))} className="lang-te w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="cat-slug" className="mb-1 block text-xs font-medium text-gray-600">{t('category.slug')}</label>
                <input id="cat-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder={editing === 'new' ? 'auto-generated-from-name' : ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <p className="mt-1 text-xs text-gray-400">{t('category.slugHint')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cat-image" className="mb-1 block text-xs font-medium text-gray-600">{t('category.image')}</label>
                  <input id="cat-image" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="cat-icon" className="mb-1 block text-xs font-medium text-gray-600">{t('category.icon')}</label>
                  <input id="cat-icon" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="Home, Building2, LandPlot..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600">{t('category.transactionTypes')}</span>
                <div className="flex gap-3">
                  {TRANSACTION_TYPES.map((tt) => (
                    <label key={tt} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" checked={form.transactionTypes.includes(tt)} onChange={() => toggleListValue('transactionTypes', tt)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                      {tt}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs font-medium text-gray-600">{t('category.areaUnits')}</span>
                <div className="flex flex-wrap gap-3">
                  {AREA_UNITS.map((unit) => (
                    <label key={unit} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <input type="checkbox" checked={form.areaUnits.includes(unit)} onChange={() => toggleListValue('areaUnits', unit)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                      {unit}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="cat-fields" className="mb-1 block text-xs font-medium text-gray-600">{t('category.propertyFields')}</label>
                <input id="cat-fields" value={form.propertyFields} onChange={(e) => setForm((f) => ({ ...f, propertyFields: e.target.value }))} placeholder="bedrooms, bathrooms, facing" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <p className="mt-1 text-xs text-gray-400">{t('category.propertyFieldsHint')}</p>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                  {t('category.active')}
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                  {t('category.visible')}
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                {t('category.cancel')}
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">
                {editing === 'new' ? t('category.create') : t('category.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="font-semibold text-brand-800">{t('modal.confirmDeleteTitle')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('modal.confirmDeleteBody')}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                {t('category.cancel')}
              </button>
              <button type="button" onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-warm-white">
                {t('category.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
