import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { POPULAR_LOCATIONS } from '../../data/locations';

export default function PopularLocations() {
  const { t } = useTranslation('common');
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.popularLocations')}</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {POPULAR_LOCATIONS.map((loc) => (
          <Link
            key={loc.city}
            to={`/properties?city=${encodeURIComponent(loc.city)}`}
            className="group relative h-28 overflow-hidden rounded-xl shadow-sm"
          >
            <img src={loc.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-white">
              <span className="font-semibold">{loc.city}</span>
              <span className="text-xs">{loc.count}+</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
