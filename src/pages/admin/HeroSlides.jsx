import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Pencil, Trash2, Upload } from 'lucide-react';
import { heroSlideService } from '../../services/heroSlideService';
import { resolveAssetUrl } from '../../api/client';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import EmptyState from '../../components/common/EmptyState';

const EMPTY_FORM = {
  headingEn: '',
  headingTe: '',
  subtitleEn: '',
  subtitleTe: '',
  status: 'active',
  sortOrder: 0,
};

export default function HeroSlides() {
  const { t } = useTranslation('dashboard');
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  async function load() {
    setLoading(true);
    try {
      const list = await heroSlideService.listAll();
      setSlides(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load hero slides');
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setPreviewUrl('');
  }

  function startEdit(slide) {
    setEditingId(slide.id);
    setForm({
      headingEn: slide.headingEn || '',
      headingTe: slide.headingTe || '',
      subtitleEn: slide.subtitleEn || '',
      subtitleTe: slide.subtitleTe || '',
      status: slide.status || 'active',
      sortOrder: slide.sortOrder ?? 0,
    });
    setImageFile(null);
    setPreviewUrl(resolveAssetUrl(slide.image));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!editingId && !imageFile) {
      toast.error(t('heroSlides.imageRequired', { defaultValue: 'Please choose a hero image.' }));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        headingEn: form.headingEn,
        headingTe: form.headingTe,
        subtitleEn: form.subtitleEn,
        subtitleTe: form.subtitleTe,
        status: form.status,
        sortOrder: String(form.sortOrder ?? 0),
      };

      if (editingId) {
        await heroSlideService.update(editingId, payload, imageFile);
        toast.success(t('heroSlides.updated', { defaultValue: 'Hero slide updated.' }));
      } else {
        await heroSlideService.create(payload, imageFile);
        toast.success(t('heroSlides.created', { defaultValue: 'Hero slide created.' }));
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
      title: t('heroSlides.confirmDeleteTitle', { defaultValue: 'Delete hero slide?' }),
      message: t('heroSlides.confirmDelete', { defaultValue: 'Delete this hero slide? This cannot be undone.' }),
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await heroSlideService.remove(id);
      toast.success(t('heroSlides.deleted', { defaultValue: 'Hero slide deleted.' }));
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-brand-800">
          {t('heroSlides.title', { defaultValue: 'Hero Slider Images' })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('heroSlides.subtitle', { defaultValue: 'Upload images shown in the home page scrolling banner.' })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4 max-w-3xl">
        <h2 className="text-sm font-semibold text-brand-800">
          {editingId
            ? t('heroSlides.editSlide', { defaultValue: 'Edit slide' })
            : t('heroSlides.addSlide', { defaultValue: 'Add slide' })}
        </h2>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('heroSlides.image', { defaultValue: 'Banner image' })}
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 hover:bg-gray-100">
            <Upload size={20} />
            <span>{imageFile ? imageFile.name : t('heroSlides.chooseImage', { defaultValue: 'Choose image (JPG/PNG/WEBP)' })}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </label>
          {previewUrl && (
            <img src={previewUrl} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="headingEn" className="mb-1.5 block text-sm font-medium text-gray-700">Heading (EN)</label>
            <input
              id="headingEn"
              value={form.headingEn}
              onChange={(e) => setForm((f) => ({ ...f, headingEn: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Find the Right Property. Build Your Future."
            />
          </div>
          <div>
            <label htmlFor="headingTe" className="mb-1.5 block text-sm font-medium text-gray-700">Heading (TE)</label>
            <input
              id="headingTe"
              value={form.headingTe}
              onChange={(e) => setForm((f) => ({ ...f, headingTe: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="subtitleEn" className="mb-1.5 block text-sm font-medium text-gray-700">Subtitle (EN)</label>
            <textarea
              id="subtitleEn"
              rows={2}
              value={form.subtitleEn}
              onChange={(e) => setForm((f) => ({ ...f, subtitleEn: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="subtitleTe" className="mb-1.5 block text-sm font-medium text-gray-700">Subtitle (TE)</label>
            <textarea
              id="subtitleTe"
              rows={2}
              value={form.subtitleTe}
              onChange={(e) => setForm((f) => ({ ...f, subtitleTe: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-gray-700">Sort order</label>
            <input
              id="sortOrder"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60"
          >
            <ImagePlus size={16} />
            {saving
              ? t('common.saving', { defaultValue: 'Saving...' })
              : editingId
                ? t('heroSlides.update', { defaultValue: 'Update slide' })
                : t('heroSlides.create', { defaultValue: 'Publish slide' })}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="max-w-4xl">
        <h2 className="mb-3 text-sm font-semibold text-brand-800">
          {t('heroSlides.published', { defaultValue: 'Published slides' })}
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : slides.length === 0 ? (
          <EmptyState titleKey="empty.noResults" />
        ) : (
          <ul className="space-y-3">
            {slides.map((slide) => (
              <li key={slide.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center">
                <img
                  src={resolveAssetUrl(slide.image)}
                  alt=""
                  className="h-24 w-full rounded-lg object-cover sm:h-20 sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-brand-900">{slide.headingEn || '—'}</p>
                  <p className="truncate text-xs text-gray-500">{slide.subtitleEn || ''}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {slide.status} · order {slide.sortOrder}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(slide)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(slide.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
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
