import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MAP_LAYOUTS } from '../../config/mapLayouts';

/**
 * Homepage "Layouts" section — a separate top-level section from
 * CategoryStrip's property Categories, per the site's architecture split:
 * Categories = property types (Apartments, Villas, ...), Layouts =
 * individual plotted-layout projects with their own interactive map.
 *
 * Deliberately renders lightweight preview cards only (no iframe/SVG map),
 * so the homepage never loads the heavy interactive layouts until the user
 * picks one. The full map lives at /map-layout/:layoutKey.
 */
export default function LayoutsStrip() {
  const { t } = useTranslation('common');

  if (!MAP_LAYOUTS.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6 lg:py-10">
      <h2 className="text-lg font-bold text-brand-800 sm:text-xl md:text-2xl lg:text-2xl">
        {t('sections.layouts')}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3 lg:gap-4">
        {MAP_LAYOUTS.map((layout) => (
          <Link
            key={layout.key}
            to={`/map-layout/${layout.key}`}
            className="group relative flex aspect-[16/10] items-end overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg"
          >
            {layout.image && (
              <img
                src={layout.image}
                alt={layout.imageAlt || layout.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative z-10 w-full p-3 sm:p-4">
              <span className="block text-sm font-bold leading-tight text-white drop-shadow sm:text-base md:text-lg">
                {layout.shortTitle || layout.title}
              </span>
              <span className="block text-[11px] text-white/80 sm:text-xs">
                {layout.phasesLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
