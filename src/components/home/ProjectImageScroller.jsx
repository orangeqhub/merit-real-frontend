import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SmartImage from '../common/SmartImage';
import { PROJECT_IMAGES } from '../../data/projectImages';

const DEVELOPMENT_IMAGES = [
  { id: 'building', src: PROJECT_IMAGES.building, alt: 'Modern residential building developed by Merit Real Solutions', label: 'Building' },
  { id: 'field', src: PROJECT_IMAGES.field, alt: 'Open plotted development field', label: 'Field' },
  { id: 'villa', src: PROJECT_IMAGES.villa, alt: 'Premium villa property', label: 'Villa' },
];

/**
 * Homepage showcase that auto-scrolls the local project photographs
 * (building, field, villa). Pauses on hover, respects reduced motion,
 * and remains manually scrollable as a fallback.
 */
export default function ProjectImageScroller() {
  const { t } = useTranslation('common');
  // Duplicate the strip once so translateX(-50%) loops seamlessly.
  const track = useMemo(() => [...DEVELOPMENT_IMAGES, ...DEVELOPMENT_IMAGES], []);

  return (
    <section className="mx-auto w-full max-w-screen-2xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6 lg:py-10">
      <div>
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">
          {t('sections.developments', { defaultValue: 'Our Developments' })}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t('sections.developmentsSubtitle', {
            defaultValue: 'A glimpse of the residential projects by Merit Real Solutions',
          })}
        </p>
      </div>

      <div className="scroll-x-mask group/scroller relative mt-5 overflow-x-auto scrollbar-none">
        <div className="animate-scroll-x flex w-max gap-4 group-hover/scroller:[animation-play-state:paused]">
          {track.map((img, i) => (
            <div key={`${img.id}-${i}`} className="w-64 shrink-0 sm:w-80 md:w-80">
              <div className="h-44 overflow-hidden rounded-2xl shadow-sm sm:h-52 md:h-56">
                <SmartImage
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/scroller:scale-[1.03]"
                />
              </div>
              <p className="mt-2 text-sm font-semibold text-brand-800">{img.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
