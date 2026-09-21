import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import { MAP_LAYOUTS } from '../../config/mapLayouts';
import SmartImage from '../../components/common/SmartImage';

export default function MapLayouts() {
  return (
    <div className="pb-12">
      <div className="border-b border-gray-100 bg-brand-50/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-brand-900">Map Layouts</h1>
          <p className="mt-1 text-sm text-gray-600">
            Explore our interactive plotted layouts. Select a layout to pan, zoom, inspect plots,
            and book available ones from the status board.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {MAP_LAYOUTS.map((layout) => (
            <Link
              key={layout.key}
              to={`/map-layout/${layout.key}`}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-48 sm:h-56">
                <SmartImage
                  src={layout.image}
                  alt={layout.imageAlt}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  loading="eager"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-gold-400/60 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                  <MapIcon size={12} aria-hidden="true" />
                  {layout.phasesLabel}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-brand-900">{layout.title}</h2>
                  <p className="mt-1 text-xs text-gray-500">{layout.tagline}</p>
                </div>
                <ArrowRight
                  size={20}
                  className="shrink-0 text-brand-600 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}