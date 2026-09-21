import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Pencil, Trash2, Upload, Power, PowerOff } from 'lucide-react';
import { promotionService, PROMOTION_TYPES } from '../../services/promotionService';
import { propertyService } from '../../services/propertyService';
import { resolveAssetUrl } from '../../api/client';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import EmptyState from '../../components/common/EmptyState';

const EMPTY_FORM = {
  title: '',
  description: '',
  promotionType: 'FEATURED_PROPERTY',
  ctaButtonText: 'View Property',
  ctaAction: 'PROPERTY_DETAILS',
  priority: 0,
  offerPrice: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  primaryPropertyId: '',
  propertyIds: [],
};

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminPromotions() {
  const { t } = useTranslation('dashboard');
  const [items, setItems] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bannerFile, setBannerFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [propertySearch, setPropertySearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [list, props] = await Promise.all([
        promotionService.listAll(),
        propertyService.getProperties({ admin: true, pageSize: 100, silent: true }),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setProperties(props?.items || (Array.isArray(props) ? props : []));
    } catch (err) {
      toast.error(err.message || 'Failed to load promotions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!bannerFile) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(bannerFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    if (!q) return properties.slice(0, 80);
    return properties.filter((p) => {
      const hay = `${p.titleEn || ''} ${p.id} ${p.city || ''} ${p.locality || ''}`.toLowerCase();
      return hay.includes(q);
    }).slice(0, 80);
  }, [properties, propertySearch]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBannerFile(null);
    setPreviewUrl('');
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      promotionType: item.promotionType || 'FEATURED_PROPERTY',
      ctaButtonText: item.ctaButtonText || 'View Property',
      ctaAction: item.ctaAction || 'PROPERTY_DETAILS',
      priority: item.priority ?? 0,
      offerPrice: item.offerPrice != null ? String(item.offerPrice) : '',
      startDate: toLocalInput(item.startDate),
      endDate: toLocalInput(item.endDate),
      status: item.status || 'ACTIVE',
      primaryPropertyId: String(item.primaryPropertyId || ''),
      propertyIds: item.propertyIds?.length ? item.propertyIds.map(Number) : [Number(item.primaryPropertyId)].filter(Boolean),
    });
    setBannerFile(null);
    setPreviewUrl(resolveAssetUrl(item.bannerImage) || '');
  }

  function toggleProperty(id) {
    const num = Number(id);
    setForm((prev) => {
      const exists = prev.propertyIds.includes(num);
      const propertyIds = exists
        ? prev.propertyIds.filter((x) => x !== num)
        : [...prev.propertyIds, num];
      let primaryPropertyId = prev.primaryPropertyId;
      if (!propertyIds.map(Number).includes(Number(primaryPropertyId))) {
        primaryPropertyId = propertyIds[0] ? String(propertyIds[0]) : '';
      }
      return { ...prev, propertyIds, primaryPropertyId };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!form.propertyIds.length) {
      toast.error('Select at least one property.');
      return;
    }
    if (!editingId && !bannerFile) {
      toast.error('Please upload a promotion banner.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        promotionType: form.promotionType,
        ctaButtonText: form.ctaButtonText || 'View Property',
        ctaAction: form.ctaAction || 'PROPERTY_DETAILS',
        priority: String(form.priority ?? 0),
        offerPrice: form.offerPrice,
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        status: form.status,
        primaryPropertyId: form.primaryPropertyId || String(form.propertyIds[0]),
        propertyIds: form.propertyIds,
      };

      if (editingId) {
        await promotionService.update(editingId, payload, bannerFile);
        toast.success(t('promotions.updated', { defaultValue: 'Promotion updated.' }));
      } else {
        await promotionService.create(payload, bannerFile);
        toast.success(t('promotions.created', { defaultValue: 'Promotion created.' }));
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = await confirmDialog({
      title: t('promotions.confirmDeleteTitle', { defaultValue: 'Delete promotion?' }),
      message: t('promotions.confirmDelete', { defaultValue: 'Delete this promotion? This cannot be undone.' }),
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await promotionService.remove(id);
      toast.success(t('promotions.deleted', { defaultValue: 'Promotion deleted.' }));
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  }

  async function toggleStatus(item) {
    try {
      if (item.status === 'ACTIVE') {
        await promotionService.deactivate(item.id);
        toast.success('Promotion deactivated.');
      } else {
        await promotionService.activate(item.id);
        toast.success('Promotion activated.');
      }
      await load();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-800">
          <Megaphone size={22} />
          {t('promotions.title', { defaultValue: 'Promotions' })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('promotions.subtitle', { defaultValue: 'Publish trending, featured, and offer banners across the website and customer portal.' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4 max-w-4xl">
        <h2 className="text-sm font-semibold text-brand-800">
          {editingId
            ? t('promotions.edit', { defaultValue: 'Edit promotion' })
            : t('promotions.add', { defaultValue: 'Create promotion' })}
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Banner image</label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 hover:bg-gray-100">
            <Upload size={20} />
            <span>{bannerFile ? bannerFile.name : 'Choose image (JPG/PNG/WEBP)'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
            />
          </label>
          {previewUrl && (
            <img src={previewUrl} alt="" className="mt-3 h-36 w-full max-w-md rounded-lg object-cover" />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Short description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Promotion type</label>
            <select
              value={form.promotionType}
              onChange={(e) => setForm((f) => ({ ...f, promotionType: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PROMOTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">CTA button text</label>
            <input
              value={form.ctaButtonText}
              onChange={(e) => setForm((f) => ({ ...f, ctaButtonText: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="View Property / Book Now / Explore"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Offer price (optional)</label>
            <input
              type="number"
              value={form.offerPrice}
              onChange={(e) => setForm((f) => ({ ...f, offerPrice: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">CTA action</label>
            <select
              value={form.ctaAction}
              onChange={(e) => setForm((f) => ({ ...f, ctaAction: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="PROPERTY_DETAILS">Navigate to Property Details</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Start date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Leave empty to start immediately.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">End date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Inclusive full day. Leave empty for no expiry.</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Properties</label>
          <input
            value={propertySearch}
            onChange={(e) => setPropertySearch(e.target.value)}
            placeholder="Search properties…"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="max-h-48 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
            {filteredProperties.map((p) => {
              const checked = form.propertyIds.includes(Number(p.id));
              const isPrimary = String(form.primaryPropertyId) === String(p.id);
              return (
                <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProperty(p.id)}
                  />
                  <span className="flex-1 min-w-0 truncate">
                    #{p.id} · {p.titleEn}
                    {p.city ? ` · ${p.city}` : ''}
                  </span>
                  {checked && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, primaryPropertyId: String(p.id) }))}
                      className={`shrink-0 text-xs font-medium ${isPrimary ? 'text-brand-700' : 'text-gray-400 hover:text-brand-600'}`}
                    >
                      {isPrimary ? 'Primary CTA' : 'Set primary'}
                    </button>
                  )}
                </label>
              );
            })}
            {!filteredProperties.length && (
              <p className="px-3 py-4 text-sm text-gray-500">No properties found.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Update promotion' : 'Save promotion'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-brand-800">All promotions</h2>
        </div>
        {loading ? (
          <p className="px-4 py-8 text-sm text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState titleKey="empty.noResults" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <img
                  src={resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image)}
                  alt=""
                  className="h-20 w-full rounded-lg object-cover sm:h-16 sm:w-28 shrink-0 bg-gray-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-brand-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-brand-800">
                      {item.promotionTypeLabel}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-400">Priority {item.priority}</span>
                  </div>
                  <p className="mt-1 font-semibold text-brand-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-500 truncate">{item.property?.titleEn}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => startEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" onClick={() => toggleStatus(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                    {item.status === 'ACTIVE' ? <><PowerOff size={14} /> Deactivate</> : <><Power size={14} /> Activate</>}
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
