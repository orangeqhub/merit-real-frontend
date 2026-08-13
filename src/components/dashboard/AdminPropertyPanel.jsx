import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Plus, Search, Star, Trash2, X, ListPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import TablePagination from '../common/TablePagination';
import TableActionsMenu from '../common/TableActionsMenu';
import StatusBadge from './StatusBadge';
import { categoryService } from '../../services/categoryService';
import { propertyService } from '../../services/propertyService';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import MapLocationPicker from '../forms/MapLocationPicker';
import CategorySpecificFields from '../forms/CategorySpecificFields';
import PropertyImageGalleryUploader, { buildImageGalleryPayload } from '../forms/PropertyImageGalleryUploader';
import { resolveAssetUrl } from '../../api/client';
import { resolveCategorySlug, loadCategoryDetailsFromProperty, buildCategoryDetailsPayload } from '../../utils/categoryDetailsUtils';
import { emptyCategoryDetails } from '../../utils/propertyCategoryFieldConfig';
import { formatIndianCurrency, formatIndianNumericText } from '../../utils/formatIndianNumber';
import { runQueuedTasks, summarizeBulkResults } from '../../utils/bulkPropertyQueue';
import BulkPropertyProgress from './BulkPropertyProgress';
import { useRealtimeEvent } from '../../hooks/useDomainRealtime';

const EMPTY_FORM = {
  categoryId: '',
  titleEn: '',
  titleTe: '',
  descriptionEn: '',
  city: '',
  district: '',
  locality: '',
  state: 'Andhra Pradesh',
  pincode: '',
  address: '',
  mapLocation: '',
  price: '',
  area: '',
  facing: '',
  northMeasurement: '',
  eastMeasurement: '',
  westMeasurement: '',
  southMeasurement: '',
  contactName: '',
  contactPhone: '',
  isFeatured: false,
  isTrending: false,
  isVerified: true,
  status: 'ACTIVE',
  attributeIds: [],
  categoryDetails: {},
  categoryDetailsBySlug: {},
};

export default function AdminPropertyPanel() {
  const { t } = useTranslation(['dashboard', 'common', 'properties']);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageGallery, setImageGallery] = useState({ items: [], deletedIds: [] });
  const [saving, setSaving] = useState(false);
  const [postQueue, setPostQueue] = useState([]);
  const [bulkProgress, setBulkProgress] = useState(null);
  const submitLockRef = useRef(false);
  const [categoryDetail, setCategoryDetail] = useState(null);

  async function loadCategories() {
    try {
      const list = await categoryService.getCategories();
      setCategories(list);
    } catch (err) {
      toast.error(err.message || 'Failed to load categories');
    }
  }

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await propertyService.getProperties({
        page: nextPage,
        pageSize,
        search: search.trim() || undefined,
        categorySlug: categoryFilter || undefined,
        featured: section === 'featured' || undefined,
        trending: section === 'trending' || undefined,
        includeAllStatuses: true,
        admin: true,
        sort: 'newest',
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Failed to load properties');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, categoryFilter, pageSize]);

  useRealtimeEvent('property:created', () => { load(1); }, true);
  useRealtimeEvent('property:updated', () => { load(page); }, true);

  useEffect(() => {
    if (!form.categoryId) {
      setCategoryDetail(null);
      return;
    }
    const cat = categories.find((c) => String(c.id) === String(form.categoryId));
    if (!cat) return;
    if (cat.amenities || cat.specifications || cat.attributes) {
      setCategoryDetail(cat);
      return;
    }
    categoryService.getCategoryBySlug(cat.slug).then(setCategoryDetail).catch(() => setCategoryDetail(cat));
  }, [form.categoryId, categories]);

  function openCreate() {
    setSelected(null);
    setForm({ ...EMPTY_FORM, categoryDetails: {}, categoryDetailsBySlug: {} });
    setImageGallery({ items: [], deletedIds: [] });
    setModal('create');
  }

  async function openEdit(row) {
    let full = row;
    try {
      full = await propertyService.getPropertyById(row.id) || row;
    } catch {
      full = row;
    }
    const categorySlug = full.categorySlug || resolveCategorySlug(categories, full.categoryId);
    const detailsJson = full.detailsJson || {};
    const categoryDetailsBySlug = detailsJson.categoryDetailsBySlug || {};
    const categoryDetails = loadCategoryDetailsFromProperty(full, categorySlug);

    setSelected(full);
    setForm({
      categoryId: String(full.categoryId || ''),
      titleEn: full.titleEn || '',
      titleTe: full.titleTe || '',
      descriptionEn: full.descriptionEn || '',
      city: full.city || '',
      district: full.district || '',
      locality: full.locality || '',
      state: full.state || 'Andhra Pradesh',
      pincode: full.pincode || '',
      address: full.address || '',
      mapLocation: full.mapLocation || '',
      price: full.price != null ? String(full.price) : '',
      area: full.area != null ? String(full.area) : '',
      facing: full.facing || '',
      northMeasurement: full.northMeasurement || '',
      eastMeasurement: full.eastMeasurement || '',
      westMeasurement: full.westMeasurement || '',
      southMeasurement: full.southMeasurement || '',
      contactName: full.contactName || '',
      contactPhone: full.contactPhone || '',
      isFeatured: Boolean(full.isFeatured || full.featured),
      isTrending: Boolean(full.isTrending || full.trending),
      isVerified: full.isVerified !== false && full.verified !== false,
      status: String(full.status || 'active').toUpperCase(),
      attributeIds: full.attributeIds || [],
      categoryDetails,
      categoryDetailsBySlug,
    });
    setImageGallery({ items: [], deletedIds: [] });
    setModal('edit');
  }

  function openView(row) {
    setSelected(row);
    setModal('view');
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setSelected(null);
    setForm(EMPTY_FORM);
    setImageGallery({ items: [], deletedIds: [] });
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateCategoryId(newCategoryId) {
    setForm((f) => {
      const oldSlug = resolveCategorySlug(categories, f.categoryId);
      const newSlug = resolveCategorySlug(categories, newCategoryId);
      const bySlug = { ...(f.categoryDetailsBySlug || {}) };
      if (oldSlug) bySlug[oldSlug] = f.categoryDetails || {};
      const nextDetails = bySlug[newSlug]
        ? { ...emptyCategoryDetails(newSlug), ...bySlug[newSlug] }
        : emptyCategoryDetails(newSlug);
      return {
        ...f,
        categoryId: newCategoryId,
        categoryDetailsBySlug: bySlug,
        categoryDetails: nextDetails,
      };
    });
  }

  function toggleAttribute(id) {
    setForm((f) => {
      const has = f.attributeIds.includes(id);
      return {
        ...f,
        attributeIds: has ? f.attributeIds.filter((x) => x !== id) : [...f.attributeIds, id],
      };
    });
  }

  const selectedCategorySlug = useMemo(
    () => resolveCategorySlug(categories, form.categoryId),
    [categories, form.categoryId]
  );

  function resetCreateForm() {
    setForm({ ...EMPTY_FORM, categoryDetails: {}, categoryDetailsBySlug: {} });
    setImageGallery({ items: [], deletedIds: [] });
    setSelected(null);
  }

  function buildSubmissionPayload() {
    const categoryPayload = buildCategoryDetailsPayload(
      selectedCategorySlug,
      form.categoryDetails,
      { categoryDetailsBySlug: form.categoryDetailsBySlug }
    );
    const { newFiles, imageGalleryMeta } = buildImageGalleryPayload(imageGallery);
    const clientRequestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    return {
      payload: {
        categoryId: Number(form.categoryId),
        titleEn: form.titleEn.trim(),
        titleTe: form.titleTe.trim(),
        descriptionEn: form.descriptionEn,
        city: form.city,
        district: form.district,
        locality: form.locality,
        state: form.state,
        pincode: form.pincode,
        address: form.address,
        mapLocation: form.mapLocation.trim(),
        price: form.price,
        area: form.area,
        facing: form.facing,
        northMeasurement: form.northMeasurement,
        eastMeasurement: form.eastMeasurement,
        westMeasurement: form.westMeasurement,
        southMeasurement: form.southMeasurement,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        isFeatured: form.isFeatured,
        isTrending: false,
        isVerified: form.isVerified,
        status: form.status || 'ACTIVE',
        attributeIds: form.attributeIds,
        categoryDetails: categoryPayload.categoryDetails,
        categoryDetailsBySlug: categoryPayload.categoryDetailsBySlug,
        imageGalleryMeta,
        replaceImages: false,
        clientRequestId,
      },
      newFiles,
      label: form.titleEn.trim(),
    };
  }

  async function submitSingleProperty({ keepOpen = false } = {}) {
    if (submitLockRef.current) return null;
    if (!form.categoryId || !form.titleEn.trim()) {
      toast.error('Category and title are required.');
      return null;
    }

    submitLockRef.current = true;
    setSaving(true);
    try {
      const { payload, newFiles } = buildSubmissionPayload();

      if (modal === 'create') {
        const created = await propertyService.createProperty(payload, newFiles);
        toast.success(t('toast.propertyCreated', { defaultValue: 'Property published successfully.' }));
        if (keepOpen) {
          resetCreateForm();
          load(1);
        } else {
          closeModal();
          load(1);
        }
        return created;
      }

      await propertyService.updateProperty(selected.id, payload, newFiles);
      toast.success(t('toast.propertyUpdated', { defaultValue: 'Property updated successfully.' }));
      closeModal();
      load(page);
      return true;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setSaving(false);
      submitLockRef.current = false;
    }
  }

  function snapshotCurrentForQueue() {
    if (!form.categoryId || !form.titleEn.trim()) {
      toast.error('Category and title are required to add to queue.');
      return null;
    }
    const submission = buildSubmissionPayload();
    return {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      ...submission,
    };
  }

  function handleAddToQueue() {
    const snap = snapshotCurrentForQueue();
    if (!snap) return;
    setPostQueue((q) => {
      toast.success(`Added to queue (${q.length + 1} total).`);
      return [...q, snap];
    });
    resetCreateForm();
  }

  async function runBulkQueue(queueItems, { startIndex = 0 } = {}) {
    const slice = queueItems.slice(startIndex);
    if (!slice.length) return [];

    setBulkProgress({
      open: true,
      completed: 0,
      total: slice.length,
      succeeded: 0,
      failed: 0,
      results: [],
    });

    const results = await runQueuedTasks(
      slice,
      async (item) => propertyService.createProperty(item.payload, item.newFiles),
      {
        concurrency: 3,
        onProgress: (progress) => {
          setBulkProgress((prev) => ({
            ...prev,
            open: true,
            completed: progress.completed,
            total: progress.total,
            succeeded: progress.succeeded,
            failed: progress.failed,
            results: progress.results,
          }));
        },
      }
    );

    const summary = summarizeBulkResults(results);
    if (summary.failed === 0) {
      toast.success(`${summary.succeeded} / ${summary.total} properties posted successfully.`);
      setPostQueue([]);
    } else {
      toast.error(`${summary.succeeded} succeeded, ${summary.failed} failed. Retry failed items.`);
      const failedItems = results
        .map((r, i) => (r?.ok ? null : queueItems[startIndex + i]))
        .filter(Boolean);
      setPostQueue(failedItems);
    }

    load(1);
    return results;
  }

  async function handlePostQueue() {
    if (!postQueue.length) {
      toast.info('Queue is empty. Add properties using "Add to queue".');
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      await runBulkQueue(postQueue);
    } finally {
      submitLockRef.current = false;
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    await submitSingleProperty({ keepOpen: false });
  }

  async function handlePostAndAddAnother(e) {
    e.preventDefault();
    await submitSingleProperty({ keepOpen: true });
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Delete property?',
      message: `Delete "${row.titleEn}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await propertyService.deleteProperty(row.id);
      toast.success(t('toast.propertyDeleted', { defaultValue: 'Property deleted.' }));
      load(page);
    } catch (err) {
      toast.error(err.message || 'Failed to delete property.');
    }
  }

  const specs = useMemo(
    () => categoryDetail?.specifications || (categoryDetail?.attributes || []).filter((a) => a.type === 'SPECIFICATION'),
    [categoryDetail]
  );
  const amenities = useMemo(
    () => categoryDetail?.amenities || (categoryDetail?.attributes || []).filter((a) => a.type === 'AMENITY'),
    [categoryDetail]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">
            {t('admin.propertyManagement', { defaultValue: 'Property Management' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Post properties to the website. Mark Featured as needed. Latest is automatic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {postQueue.length > 0 && (
            <button
              type="button"
              onClick={handlePostQueue}
              disabled={Boolean(bulkProgress?.open && bulkProgress.completed < bulkProgress.total)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60"
            >
              <ListPlus size={16} /> Post queue ({postQueue.length})
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
          >
            <Plus size={16} /> Post Property
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
            placeholder="Search title, city, locality…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.nameEn}</option>
          ))}
        </select>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All listings</option>
          <option value="featured">Featured</option>
        </select>
        <button
          type="button"
          onClick={() => load(1)}
          className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">ID</th>
                  <th className="whitespace-nowrap px-4 py-3">Property</th>
                  <th className="whitespace-nowrap px-4 py-3">Category</th>
                  <th className="whitespace-nowrap px-4 py-3">Location</th>
                  <th className="whitespace-nowrap px-4 py-3">Price</th>
                  <th className="whitespace-nowrap px-4 py-3">Area</th>
                  <th className="whitespace-nowrap px-4 py-3">Flags</th>
                  <th className="whitespace-nowrap px-4 py-3">Status</th>
                  <th className="whitespace-nowrap px-4 py-3">Posted</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const primaryImage = row.images?.find((img) => img.isPrimary) || row.images?.[0];
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-700">#{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {primaryImage?.url ? (
                            <img src={resolveAssetUrl(primaryImage.url)} alt="" className="h-10 w-14 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-10 w-14 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400">
                              No img
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900" title={row.titleEn}>{row.titleEn}</p>
                            {row.titleTe && <p className="lang-te truncate text-xs text-gray-500">{row.titleTe}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.categoryNameEn || row.categorySlug || '—'}</td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-gray-600" title={row.locationEn || row.city || ''}>
                        {row.locationEn || row.city || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {formatIndianCurrency(row.price || 0)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {row.area ? formatIndianNumericText(row.area) : '—'}
                        {row.facing ? ` · ${row.facing}` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(row.featured || row.isFeatured) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              <Star size={11} /> Featured
                            </span>
                          )}
                          {!row.featured && !row.isFeatured && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <TableActionsMenu
                            items={[
                              {
                                key: 'view',
                                label: 'View',
                                icon: Eye,
                                onClick: () => openView(row),
                              },
                              {
                                key: 'edit',
                                label: 'Edit',
                                icon: Pencil,
                                onClick: () => openEdit(row),
                              },
                              {
                                key: 'delete',
                                label: 'Delete',
                                icon: Trash2,
                                tone: 'danger',
                                onClick: () => handleDelete(row),
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-8">
          <form onSubmit={handleSave} className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl bg-warm-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-800">
                {modal === 'create' ? 'Post Property' : 'Edit Property'}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Category *</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => updateCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Title (EN) *</label>
                <input required value={form.titleEn} onChange={(e) => updateField('titleEn', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Title (TE)</label>
                <input value={form.titleTe} onChange={(e) => updateField('titleTe', e.target.value)} className="lang-te w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Price (₹)</label>
                <input type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Property Dimensions</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Area</label>
                <input
                  type="text"
                  value={form.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  placeholder="e.g. 1200 Sq.Ft"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Facing</label>
                <input
                  type="text"
                  value={form.facing}
                  onChange={(e) => updateField('facing', e.target.value)}
                  placeholder="e.g. East, North-East"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">Measurements</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">North</label>
                <input
                  type="text"
                  value={form.northMeasurement}
                  onChange={(e) => updateField('northMeasurement', e.target.value)}
                  placeholder="e.g. 40 Ft"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">East</label>
                <input
                  type="text"
                  value={form.eastMeasurement}
                  onChange={(e) => updateField('eastMeasurement', e.target.value)}
                  placeholder="e.g. 60 Ft"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">West</label>
                <input
                  type="text"
                  value={form.westMeasurement}
                  onChange={(e) => updateField('westMeasurement', e.target.value)}
                  placeholder="e.g. 60 Ft"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">South</label>
                <input
                  type="text"
                  value={form.southMeasurement}
                  onChange={(e) => updateField('southMeasurement', e.target.value)}
                  placeholder="e.g. 40 Ft"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
                <input value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">District</label>
                <input value={form.district} onChange={(e) => updateField('district', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Locality</label>
                <input value={form.locality} onChange={(e) => updateField('locality', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Pincode</label>
                <input value={form.pincode} onChange={(e) => updateField('pincode', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">State</label>
                <input value={form.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Address</label>
                <input value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Full property address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>

              <CategorySpecificFields
                categorySlug={selectedCategorySlug}
                values={form.categoryDetails}
                onChange={(categoryDetails) => updateField('categoryDetails', categoryDetails)}
              />

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Map location <span className="font-normal text-gray-400">(optional — latitude, longitude)</span>
                </label>
                <MapLocationPicker
                  value={form.mapLocation}
                  onChange={({ mapLocation, address }) => {
                    updateField('mapLocation', mapLocation);
                    if (address && !form.address) updateField('address', address);
                    if (address && !form.locality) {
                      const localityHint = String(address).split(',')[0]?.trim();
                      if (localityHint) updateField('locality', localityHint);
                    }
                  }}
                />
                <input
                  value={form.mapLocation}
                  onChange={(e) => updateField('mapLocation', e.target.value)}
                  placeholder="Selected coordinates appear here (lat,lng)"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                <textarea rows={3} value={form.descriptionEn} onChange={(e) => updateField('descriptionEn', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Contact name</label>
                <input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Contact phone</label>
                <input value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <PropertyImageGalleryUploader
                existingImages={modal === 'edit' ? selected?.images : []}
                value={imageGallery}
                onChange={setImageGallery}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Property Status</label>
                <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BOOKED">Booked</option>
                  <option value="SOLD">Sold</option>
                </select>
              </div>
            </div>

            {(specs.length > 0 || amenities.length > 0) && (
              <div className="mt-4 space-y-3">
                {specs.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">Specifications</p>
                    <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                      {specs.map((item) => (
                        <label key={item.id} className="flex items-start gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.attributeIds.includes(item.id)}
                            onChange={() => toggleAttribute(item.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
                          />
                          <span>{item.nameEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {amenities.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">Amenities</p>
                    <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
                      {amenities.map((item) => (
                        <label key={item.id} className="flex items-start gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={form.attributeIds.includes(item.id)}
                            onChange={() => toggleAttribute(item.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
                          />
                          <span>{item.nameEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateField('isFeatured', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isVerified} onChange={(e) => updateField('isVerified', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                Verified
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel</button>
              {modal === 'create' && (
                <>
                  <button
                    type="button"
                    onClick={handleAddToQueue}
                    disabled={saving}
                    className="rounded-lg border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
                  >
                    Add to queue
                  </button>
                  <button
                    type="button"
                    onClick={handlePostAndAddAnother}
                    disabled={saving}
                    className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
                  >
                    {saving ? 'Posting…' : 'Post & add another'}
                  </button>
                </>
              )}
              <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-60">
                {saving ? 'Saving…' : modal === 'create' ? 'Publish' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <BulkPropertyProgress
        open={Boolean(bulkProgress?.open)}
        completed={bulkProgress?.completed || 0}
        total={bulkProgress?.total || 0}
        succeeded={bulkProgress?.succeeded || 0}
        failed={bulkProgress?.failed || 0}
        results={bulkProgress?.results || []}
        onClose={() => setBulkProgress(null)}
        onRetryFailed={() => {
          if (postQueue.length) runBulkQueue(postQueue);
        }}
      />

      {modal === 'view' && selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-8">
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-warm-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-800">{selected.titleEn}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs uppercase text-gray-400">Category</dt><dd>{selected.categoryNameEn}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">Location</dt><dd>{selected.locationEn || '—'}</dd></div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Map location</dt>
                <dd>
                  {selected.mapLocation ? (
                    <a
                      href={/^https?:\/\//i.test(selected.mapLocation) ? selected.mapLocation : `https://www.google.com/maps?q=${encodeURIComponent(selected.mapLocation)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-brand-700 underline"
                    >
                      {selected.mapLocation}
                    </a>
                  ) : '—'}
                </dd>
              </div>
              <div><dt className="text-xs uppercase text-gray-400">Price</dt><dd>{formatIndianCurrency(selected.price || 0)}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">Area</dt><dd>{selected.area ? formatIndianNumericText(selected.area) : '—'}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">Facing</dt><dd>{selected.facing || '—'}</dd></div>
              <div>
                <dt className="text-xs uppercase text-gray-400">Measurements</dt>
                <dd className="space-y-0.5">
                  <div>North: {selected.northMeasurement || '—'}</div>
                  <div>East: {selected.eastMeasurement || '—'}</div>
                  <div>West: {selected.westMeasurement || '—'}</div>
                  <div>South: {selected.southMeasurement || '—'}</div>
                </dd>
              </div>
              <div><dt className="text-xs uppercase text-gray-400">Amenities</dt><dd>{(selected.amenities || []).join(', ') || '—'}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <Link to={`/properties/${selected.id}`} className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700">
                Open on website
              </Link>
              <button type="button" onClick={() => openEdit(selected)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-warm-white">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
