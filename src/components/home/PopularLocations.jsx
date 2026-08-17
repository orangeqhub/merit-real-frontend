import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CITY_IMAGES } from '../../data/projectImages';
import SmartImage from '../common/SmartImage';
import { useCityCounts } from '../../hooks/useCityCounts';

const FALLBACK_IMAGE = CITY_IMAGES.Guntur;

function getCityImage(city) {
  if (CITY_IMAGES[city]) return CITY_IMAGES[city];
  const normalized = city.toLowerCase().trim();
  for (const [key, img] of Object.entries(CITY_IMAGES)) {
    if (key.toLowerCase() === normalized) return img;
  }
  return FALLBACK_IMAGE;
}

export default function PopularLocations() {
  const { t } = useTranslation('common');
  const locations = useCityCounts();

  if (!locations.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6 lg:py-10">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl md:text-2xl">{t('sections.popularLocations')}</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {locations.map((loc) => (
          <Link
            key={loc.city}
            to={`/properties?city=${encodeURIComponent(loc.city)}`}
            className="group relative h-24 overflow-hidden rounded-xl shadow-sm sm:h-28 md:h-32"
          >
            <SmartImage src={getCityImage(loc.city)} alt={`${loc.city} properties`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-white">
              <span className="font-semibold">{loc.city}</span>
              <span className="text-xs">{loc.count} {loc.count === 1 ? 'property' : 'properties'}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
