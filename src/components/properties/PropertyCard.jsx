import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MessageCircle, Heart, MapPin, BadgeCheck, Star, Ruler, Scale } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCompareStore } from '../../store/compareStore';
import { getLocalizedField } from '../../utils/localize';
import { buildTelLink, buildWhatsAppLink } from '../../utils/contactLinks';
import { toast } from '../../store/toastStore';
import { resolveAssetUrl } from '../../api/client';

function formatPrice(property) {
  const value = property.price;
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
  return `₹${formatted}`;
}

export default function PropertyCard({ property }) {
  const { t } = useTranslation('properties');
  const language = useLanguageStore((s) => s.language);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(property.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isComparing = useCompareStore((s) => s.isSelected(property.id));
  const toggleCompare = useCompareStore((s) => s.toggle);

  const title = getLocalizedField(property, 'title', language);
  const location = getLocalizedField(property, 'location', language);
  const primaryImage = property.images?.find((img) => img.isPrimary) || property.images?.[0];

  function handleWishlist(e) {
    e.preventDefault();
    const added = toggleWishlist(property.id);
    toast.success(added ? t('card.addedToWishlist') : t('card.removedFromWishlist'));
  }

  function handleCompare(e) {
    e.preventDefault();
    const result = toggleCompare(property.id);
    if (!result.ok && result.reason === 'maxReached') {
      toast.error(t('compare.maxReached', { ns: 'dashboard' }));
    } else if (!result.ok && result.reason === 'alreadyAdded') {
      toast.info(t('compare.alreadyAdded', { ns: 'dashboard' }));
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-warm-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/properties/${property.id}`} className="relative block h-44 w-full overflow-hidden bg-gray-100">
        {primaryImage && (
          <img
            src={resolveAssetUrl(primaryImage.url)}
            alt={primaryImage.caption || title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {(property.isReserved || property.status === 'booked') && (
            <span className="rounded-full bg-rose-600 px-2 py-1 text-[11px] font-semibold text-warm-white">
              Reserved
            </span>
          )}
          {(property.isSold || property.status === 'sold') && (
            <span className="rounded-full bg-gray-800 px-2 py-1 text-[11px] font-semibold text-warm-white">
              Sold
            </span>
          )}
          {property.verified && (
            <span className="flex items-center gap-1 rounded-full bg-brand-700 px-2 py-1 text-[11px] font-semibold text-warm-white">
              <BadgeCheck size={12} /> {t('card.verified')}
            </span>
          )}
          {property.featured && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[11px] font-semibold text-warm-white">
              <Star size={12} /> {t('card.featured')}
            </span>
          )}
        </div>
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={isWishlisted ? t('card.removeFromWishlist') : t('card.addToWishlist')}
            aria-pressed={isWishlisted}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-warm-white/90 text-gray-600 shadow transition-transform hover:scale-110 hover:text-red-500"
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} className={isWishlisted ? 'text-red-500' : ''} />
          </button>
          <button
            type="button"
            onClick={handleCompare}
            aria-label={isComparing ? t('compare.removeFromCompare', { ns: 'dashboard' }) : t('compare.addToCompare', { ns: 'dashboard' })}
            aria-pressed={isComparing}
            className={`flex h-8 w-8 items-center justify-center rounded-full shadow ${isComparing ? 'bg-brand-600 text-warm-white' : 'bg-warm-white/90 text-gray-600 hover:text-brand-700'}`}
          >
            <Scale size={16} />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <Link to={`/properties/${property.id}`} className="line-clamp-1 font-semibold text-brand-800 hover:underline">
          {title}
        </Link>
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} className="shrink-0" /> <span className="line-clamp-1 lang-te">{location}</span>
        </p>
        {property.distanceKm != null && (
          <p className="lang-te text-xs font-medium text-brand-700">
            {property.distanceKm < 1 ? t('location.nearYou', { ns: 'common' }) : t('location.kmAway', { ns: 'common', distance: property.distanceKm.toFixed(1) })}
          </p>
        )}
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <Ruler size={14} className="shrink-0" />{' '}
          {property.area
            ? (/[a-zA-Z]/.test(String(property.area))
              ? String(property.area)
              : `${property.area}${property.areaUnit ? ` ${property.areaUnit}` : ''}`)
            : '—'}
          {property.facing ? ` · ${property.facing}` : ''}
        </p>
        <p className="mt-1 text-lg font-bold text-brand-700">{formatPrice(property)}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={buildTelLink(property.contactPhone)}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
          >
            <Phone size={15} /> {t('buttons.call', { ns: 'common' })}
          </a>
          <a
            href={buildWhatsAppLink(property, { lang: language })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-semibold text-warm-white hover:bg-green-700"
          >
            <MessageCircle size={15} /> {t('buttons.whatsapp', { ns: 'common' })}
          </a>
        </div>
        <Link
          to={`/properties/${property.id}`}
          className="mt-2 block rounded-lg border border-brand-300 py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          {t('buttons.viewDetails', { ns: 'common' })}
        </Link>
      </div>
    </div>
  );
}
