import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cmsService } from '../../services/cmsService';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import SmartImage from '../common/SmartImage';
import { CITY_IMAGES } from '../../data/projectImages';

export default function AboutSection() {
  const { t } = useTranslation('common');
  const language = useLanguageStore((s) => s.language);
  const [cms, setCms] = useState(null);

  useEffect(() => {
    cmsService.getCms().then(setCms);
  }, []);

  return (
    <section className="bg-brand-50">
      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:gap-8 sm:px-4 sm:py-10 md:grid-cols-2 md:items-center md:px-6 md:py-12 lg:px-6 lg:py-12">
        <SmartImage
          src={CITY_IMAGES.Guntur}
          alt="Residential neighbourhood developed by Merit Real Solutions"
          className="h-52 w-full rounded-2xl object-cover shadow-md sm:h-64 md:h-80"
        />
        <div>
          <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.about')}</h2>
          <p className="mt-3 text-gray-700 lang-te">{cms ? getLocalizedField(cms, 'about', language) : ''}</p>
        </div>
      </div>
    </section>
  );
}
