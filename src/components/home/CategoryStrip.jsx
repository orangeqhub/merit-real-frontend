import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';
import { categoryService } from '../../services/categoryService';

export default function CategoryStrip() {
  const { t } = useTranslation('common');
  const language = useLanguageStore((s) => s.language);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoryService.getPublicCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  if (!categories.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.categories')}</h2>
      <div className="mt-5 flex gap-4 overflow-x-auto scrollbar-none sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible lg:grid-cols-5">
        {categories.map((cat) => {
          const Icon = Icons[cat.icon] || Icons.Home;
          const count = Number(cat.propertyCount) || 0;
          return (
            <Link
              key={cat.slug}
              to={`/properties/category/${cat.slug}`}
              className="flex w-32 shrink-0 flex-col items-center gap-2 rounded-xl border border-gray-200 bg-warm-white p-3 text-center shadow-sm transition-shadow hover:shadow-md sm:w-auto"
            >
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-2 ring-brand-100">
                {cat.image ? (
                  <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Icon size={24} className="text-brand-700" />
                )}
              </div>
              <span className="lang-te text-sm font-semibold text-gray-800">
                {language === 'te' ? (cat.nameTe || cat.nameEn) : cat.nameEn}
              </span>
              <span className="text-xs text-gray-500">{count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
