import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropertyCard from '../properties/PropertyCard';
import { PropertyCardSkeleton } from '../common/Skeleton';
import EmptyState from '../common/EmptyState';

export default function PropertySectionGrid({ titleKey, fetcher, viewAllTo }) {
  const { t } = useTranslation('common');
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    let active = true;
    fetcher().then((list) => {
      if (active) setProperties(list);
    });
    return () => {
      active = false;
    };
  }, [fetcher]);

  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 md:px-6 md:py-10 lg:px-6 lg:py-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl md:text-2xl">{t(titleKey)}</h2>
        {viewAllTo && (
          <Link to={viewAllTo} className="text-sm font-medium text-brand-700 hover:underline">
            {t('buttons.viewAll')}
          </Link>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {properties === null &&
          Array.from({ length: 4 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
        {properties?.length === 0 && (
          <div className="col-span-full">
            <EmptyState />
          </div>
        )}
        {properties?.map((p) => <PropertyCard key={p.id} property={p} />)}
      </div>
    </section>
  );
}
