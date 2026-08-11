import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Search } from 'lucide-react';
import { CATEGORIES } from '../../config/categories';
import { CITIES } from '../../data/locations';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { useSavedSearchesStore } from '../../store/savedSearchesStore';
import EmptyState from '../../components/common/EmptyState';

function emptyForm() {
  return { name: '', city: '', categorySlug: '', minPrice: '', maxPrice: '' };
}

export default function SavedSearches() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const { user } = useAuthStore();
  const { searches, refresh, save, remove } = useSavedSearchesStore();
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (user) refresh(user.id);
  }, [user, refresh]);

  function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    save(user.id, form);
    setForm(emptyForm());
  }

  function handleRun(search) {
    const params = new URLSearchParams();
    if (search.city) params.set('city', search.city);
    if (search.minPrice) params.set('minPrice', search.minPrice);
    if (search.maxPrice) params.set('maxPrice', search.maxPrice);
    const base = search.categorySlug ? `/properties/category/${search.categorySlug}` : '/properties';
    navigate(`${base}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-brand-800">{t('savedSearches.title')}</h1>

      <form onSubmit={handleSave} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="ss-name" className="mb-1.5 block text-xs font-medium text-gray-600">{t('savedSearches.nameLabel')}</label>
          <input
            id="ss-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('savedSearches.namePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="ss-city" className="mb-1.5 block text-xs font-medium text-gray-600">{t('savedSearches.cityLabel')}</label>
          <select id="ss-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">-</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ss-category" className="mb-1.5 block text-xs font-medium text-gray-600">{t('savedSearches.categoryLabel')}</label>
          <select id="ss-category" value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">-</option>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{language === 'te' ? c.nameTe : c.nameEn}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:col-span-1">
          <div>
            <label htmlFor="ss-min" className="mb-1.5 block text-xs font-medium text-gray-600">{t('savedSearches.minPriceLabel')}</label>
            <input id="ss-min" type="number" min="0" value={form.minPrice} onChange={(e) => setForm((f) => ({ ...f, minPrice: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="ss-max" className="mb-1.5 block text-xs font-medium text-gray-600">{t('savedSearches.maxPriceLabel')}</label>
            <input id="ss-max" type="number" min="0" value={form.maxPrice} onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="lg:col-span-5">
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700">
            {t('savedSearches.save')}
          </button>
        </div>
      </form>

      {searches.length === 0 ? (
        <EmptyState titleKey="savedSearches.empty" />
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{s.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {[s.city, s.categorySlug, s.minPrice && `≥ ₹${Number(s.minPrice).toLocaleString('en-IN')}`, s.maxPrice && `≤ ₹${Number(s.maxPrice).toLocaleString('en-IN')}`]
                    .filter(Boolean)
                    .join(' · ') || '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleRun(s)} className="flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                  <Search size={14} /> {t('savedSearches.run')}
                </button>
                <button type="button" onClick={() => remove(user.id, s.id)} aria-label={t('savedSearches.delete')} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
