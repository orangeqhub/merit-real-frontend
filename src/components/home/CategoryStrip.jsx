import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/languageStore';
import { categoryService } from '../../services/categoryService';

const categoryImages = {
  'agricultural-land': '/lands.jpg',
  apartment: '/apartments.jpg',
  'open-plot': '/approved layouts.jpg',
  'farm-land': '/farm lands.jpg',
  villa: '/villa projects.jpg',
  'independent-house': '/independent house.jpg',
};

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
      <div className="mt-4 grid grid-cols-3 gap-3 sm:mt-5 sm:grid-cols-6 sm:gap-3 md:gap-4 lg:grid-cols-6 lg:gap-4">
        {categories.map((cat) => {
          const img = categoryImages[cat.slug] || cat.image || null;
          const label = language === 'te' ? (cat.nameTe || cat.nameEn) : cat.nameEn;
          const count = Number(cat.propertyCount) || 0;
          return (
            <Link
              key={cat.slug}
              to={`/properties/category/${cat.slug}`}
              className="group relative flex aspect-[3/4] items-end overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg"
            >
              {img && (
                <img
                  src={img}
                  alt={label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 w-full p-2 sm:p-3 md:p-4">
                <span className="lang-te block text-[11px] font-bold leading-tight text-white drop-shadow sm:text-xs md:text-sm lg:text-sm">
                  {label}
                </span>
                <span className="block text-[10px] text-white/80 sm:text-[11px] md:text-xs">{count} {t('sections.properties', 'Properties')}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
