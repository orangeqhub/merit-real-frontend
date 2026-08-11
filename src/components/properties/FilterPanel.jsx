import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { categoryService } from '../../services/categoryService';
import { CITIES } from '../../data/locations';
import { useLanguageStore } from '../../store/languageStore';
import DualRangeSlider from '../common/DualRangeSlider';

const FACINGS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const MAX_PRICE = 20000000;
const MAX_AREA = 5000;

export default function FilterPanel({ filters, onChange, onReset, hideCategory }) {
  const { t } = useTranslation('properties');
  const language = useLanguageStore((s) => s.language);
  const [categories, setCategories] = useState(categoryService.getCached());

  useEffect(() => {
    if (categories.length) return;
    categoryService.getPublicCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, [categories.length]);

  function set(patch) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="filter-location" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('filters.location')}
        </label>
        <select
          id="filter-location"
          value={filters.city || ''}
          onChange={(e) => set({ city: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t('filters.any')}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {!hideCategory && (
        <div>
          <label htmlFor="filter-category" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('filters.category')}
          </label>
          <select
            id="filter-category"
            value={filters.categorySlug || ''}
            onChange={(e) => set({ categorySlug: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t('filters.any')}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{language === 'te' ? (c.nameTe || c.nameEn) : c.nameEn}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('filters.priceRange')}</span>
        <DualRangeSlider
          min={0}
          max={MAX_PRICE}
          step={50000}
          valueMin={filters.minPrice ?? 0}
          valueMax={filters.maxPrice ?? MAX_PRICE}
          onChange={(lo, hi) => set({ minPrice: lo, maxPrice: hi })}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>₹{(filters.minPrice ?? 0).toLocaleString('en-IN')}</span>
          <span>₹{(filters.maxPrice ?? MAX_PRICE).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('filters.areaRange')}</span>
        <DualRangeSlider
          min={0}
          max={MAX_AREA}
          step={10}
          valueMin={filters.minArea ?? 0}
          valueMax={filters.maxArea ?? MAX_AREA}
          onChange={(lo, hi) => set({ minArea: lo, maxArea: hi })}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{filters.minArea ?? 0}</span>
          <span>{filters.maxArea ?? MAX_AREA}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="filter-bedrooms" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('filters.bedrooms')}
          </label>
          <select
            id="filter-bedrooms"
            value={filters.bedrooms || ''}
            onChange={(e) => set({ bedrooms: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t('filters.any')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-bathrooms" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('filters.bathrooms')}
          </label>
          <select
            id="filter-bathrooms"
            value={filters.bathrooms || ''}
            onChange={(e) => set({ bathrooms: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t('filters.any')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="filter-facing" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('filters.facing')}
        </label>
        <select
          id="filter-facing"
          value={filters.facing || ''}
          onChange={(e) => set({ facing: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t('filters.any')}</option>
          {FACINGS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-furnishing" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('filters.furnishing')}
        </label>
        <select
          id="filter-furnishing"
          value={filters.furnishing || ''}
          onChange={(e) => set({ furnishing: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{t('filters.any')}</option>
          <option value="furnished">Furnished</option>
          <option value="semi">Semi-furnished</option>
          <option value="unfurnished">Unfurnished</option>
        </select>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('filters.featuredOrVerified')}</span>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(filters.verified)}
              onChange={(e) => set({ verified: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            {t('filters.verified')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(filters.featured)}
              onChange={(e) => set({ featured: e.target.checked || undefined })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            {t('filters.featured')}
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {t('filters.clearAll')}
      </button>
    </div>
  );
}
