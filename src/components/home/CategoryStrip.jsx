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
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6 lg:py-10">
      <h2 className="text-lg font-bold text-brand-800 sm:text-xl md:text-2xl lg:text-2xl">{t('sections.categories')}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:grid-cols-4 sm:gap-4 md:gap-5 lg:grid-cols-5">
        {categories.map((cat) => {
          const Icon = Icons[cat.icon] || Icons.Home;
          const count = Number(cat.propertyCount) || 0;
          return (
            <Link
              key={cat.slug}
              to={`/properties/category/${cat.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-warm-white p-3 text-center shadow-sm transition-shadow hover:shadow-md sm:p-4 md:p-5"
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-2 ring-brand-100 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-16 lg:w-16">
                {cat.image ? (
                  <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <Icon size={28} className="text-brand-700 md:hidden" />
                )}
                {cat.image ? null : (
                  <Icon size={32} className="hidden text-brand-700 md:block lg:hidden" />
                )}
                {cat.image ? null : (
                  <Icon size={32} className="hidden text-brand-700 lg:block" />
                )}
              </div>
              <span className="lang-te text-[11px] font-semibold leading-tight text-gray-800 sm:text-xs md:text-sm lg:text-sm">
                {language === 'te' ? (cat.nameTe || cat.nameEn) : cat.nameEn}
              </span>
              <span className="text-[10px] text-gray-500 sm:text-[11px] md:text-xs">{count}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
