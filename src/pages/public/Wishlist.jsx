import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ChevronRight } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { useWishlistStore } from '../../store/wishlistStore';
import PropertyCard from '../../components/properties/PropertyCard';
import EmptyState from '../../components/common/EmptyState';

export default function Wishlist() {
  const { t } = useTranslation('common');
  const ids = useWishlistStore((s) => s.ids);
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    if (ids.length === 0) {
      setProperties([]);
      return;
    }
    Promise.all(ids.map((id) => propertyService.getPropertyById(id))).then((list) => {
      setProperties(list.filter(Boolean));
    });
  }, [ids]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link to="/" className="hover:underline">{t('nav.home')}</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-brand-800">{t('nav.wishlist')}</span>
      </nav>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-800">
        <Heart size={24} className="text-red-500" fill="currentColor" /> {t('nav.wishlist')}
      </h1>

      {properties === null ? null : properties.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            titleKey="empty.noFavourites"
            action={
              <Link to="/properties" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700">
                {t('buttons.browseProperties')}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}
    </div>
  );
}
