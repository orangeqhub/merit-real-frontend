import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { Check } from 'lucide-react';
import { CATEGORIES } from '../../config/categories';
import { PROPERTY_TYPE_CARD_SLUGS } from '../../config/propertyTypeCards';
import { useLanguageStore } from '../../store/languageStore';

function TypeIcon({ name, ...props }) {
  const Icon = Icons[name] || Icons.Home;
  return <Icon {...props} />;
}

export default function PostPropertyType() {
  const { t } = useTranslation('forms');
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const [selectedSlug, setSelectedSlug] = useState('');

  const cards = PROPERTY_TYPE_CARD_SLUGS.map((slug) => CATEGORIES.find((c) => c.slug === slug)).filter(Boolean);

  function handleContinue() {
    const category = cards.find((c) => c.slug === selectedSlug);
    if (!category) return;
    navigate('/seller/properties/new', { state: { categorySlug: category.slug, ruleKey: category.ruleKey } });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-brand-800">{t('postPropertyType.title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('postPropertyType.subtitle')}</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((category) => {
          const selected = category.slug === selectedSlug;
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => setSelectedSlug(category.slug)}
              aria-pressed={selected}
              className={`group relative flex flex-col items-center gap-2.5 rounded-2xl border p-5 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                selected ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500' : 'border-gray-200 bg-warm-white hover:border-brand-300'
              }`}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-warm-white">
                  <Check size={12} />
                </span>
              )}
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  selected ? 'bg-brand-600 text-warm-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100'
                }`}
              >
                <TypeIcon name={category.icon} size={22} />
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {language === 'te' ? category.nameTe : category.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedSlug}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-warm-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('postPropertyType.continueButton')}
        </button>
      </div>
    </div>
  );
}
