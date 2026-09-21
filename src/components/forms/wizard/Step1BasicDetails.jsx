import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../../../config/categories';
import { useLanguageStore } from '../../../store/languageStore';

export default function Step1BasicDetails({ data, onChange, errors }) {
  const { t } = useTranslation('forms');
  const language = useLanguageStore((s) => s.language);

  function handleCategoryChange(slug) {
    const category = CATEGORIES.find((c) => c.slug === slug);
    onChange({ categorySlug: slug, ruleKey: category?.ruleKey || '' });
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wz-title" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('wizard.propertyTitle')}
        </label>
        <input
          id="wz-title"
          value={data.titleEn}
          onChange={(e) => onChange({ titleEn: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        {errors?.titleEn && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>

      <div>
        <label htmlFor="wz-category" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('wizard.category')}
        </label>
        <select
          id="wz-category"
          value={data.categorySlug}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        >
          <option value="">-</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{language === 'te' ? c.nameTe : c.nameEn}</option>
          ))}
        </select>
        {errors?.categorySlug && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>

      <div>
        <label htmlFor="wz-desc" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('wizard.description')}
        </label>
        <textarea
          id="wz-desc"
          rows={4}
          value={data.descriptionEn}
          onChange={(e) => onChange({ descriptionEn: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        {errors?.descriptionEn && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>

      <div>
        <label htmlFor="wz-venture" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('wizard.ventureName')}
        </label>
        <input
          id="wz-venture"
          value={data.ventureName}
          onChange={(e) => onChange({ ventureName: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
      </div>
    </div>
  );
}
