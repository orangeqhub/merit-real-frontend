import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  MessageCircle,
  Heart,
  Share2,
  MapPin,
  BadgeCheck,
  Star,
  Eye,
  Flag,
  CalendarPlus,
  HandHeart,
  ChevronRight,
  Scale,
} from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { cmsService } from '../../services/cmsService';
import { useAuthStore } from '../../store/authStore';
import { useFavouritesStore } from '../../store/favouritesStore';
import { useCompareStore } from '../../store/compareStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { buildTelLink, buildWhatsAppLink } from '../../utils/contactLinks';
import { toast } from '../../store/toastStore';
import ImageGallery from '../../components/properties/ImageGallery';
import EmptyState from '../../components/common/EmptyState';
import PromotionsCarousel from '../../components/promotions/PromotionsCarousel';
import PropertyCard from '../../components/properties/PropertyCard';
import { savePendingExpressInterest } from '../../utils/pendingExpressInterest';
import { savePendingSiteVisit } from '../../utils/pendingSiteVisit';

function formatPrice(property) {
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(property.price);
  return `₹${formatted}`;
}

export default function PropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('properties');
  const language = useLanguageStore((s) => s.language);
  const { user } = useAuthStore();
  const isFavourite = useFavouritesStore((s) => s.isFavourite(propertyId));
  const toggleFavourite = useFavouritesStore((s) => s.toggle);
  const isComparing = useCompareStore((s) => s.isSelected(propertyId));
  const toggleCompare = useCompareStore((s) => s.toggle);

  const [property, setProperty] = useState(null);
  const [related, setRelated] = useState([]);
  const [cms, setCms] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    propertyService.getPropertyById(propertyId).then((p) => {
      if (!active) return;
      if (!p) {
        setNotFound(true);
        return;
      }
      setProperty(p);
      propertyService.recordView(propertyId);
      propertyService.getRelated(p).then((r) => active && setRelated(r));
    });
    cmsService.getCms().then((c) => active && setCms(c));
    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleExpressInterest = useCallback(() => {
    if (property?.isReserved || property?.status === 'booked') {
      toast.info('This property is reserved (booked) and is not available for new interest.');
      return;
    }
    if (property?.isSold || property?.status === 'sold') {
      toast.info('This property has been sold.');
      return;
    }
    const target = `/express-interest/${property?.id || propertyId}#referral-agent`;
    if (!user) {
      savePendingExpressInterest(`/express-interest/${property?.id || propertyId}`);
      toast.info('Please login or register as a customer to express interest.');
      navigate('/login', {
        state: { from: `/express-interest/${property?.id || propertyId}`, intent: 'express-interest', propertyId: property?.id || propertyId },
      });
      return;
    }
    if (!['customer', 'buyer'].includes(user.role)) {
      toast.info('Only registered customers can express interest.');
      return;
    }
    if (user.status && user.status !== 'approved') {
      toast.info('Your registration is pending admin approval. You can express interest after approval.');
      navigate('/application-status', { state: { mobile: user.mobile, intent: 'express-interest' } });
      return;
    }
    navigate(target);
  }, [user, property, propertyId, navigate]);

  const handleScheduleVisit = useCallback(() => {
    if (property?.isReserved || property?.status === 'booked') {
      toast.info('This property is reserved and site visits cannot be scheduled by other customers.');
      return;
    }
    if (property?.isSold || property?.status === 'sold') {
      toast.info('This property has been sold.');
      return;
    }
    const target = `/schedule-visit/${property?.id || propertyId}`;
    // Always persist so login can resume the visit form after auth
    savePendingSiteVisit(target);

    if (!user) {
      toast.info('Please login or register as a customer to schedule a site visit.');
      navigate('/login', {
        state: {
          from: target,
          intent: 'schedule-visit',
          propertyId: property?.id || propertyId,
        },
      });
      return;
    }
    if (!['customer', 'buyer'].includes(user.role)) {
      toast.info('Please login with a customer account to schedule a site visit.');
      navigate('/login', {
        state: {
          from: target,
          intent: 'schedule-visit',
          propertyId: property?.id || propertyId,
        },
      });
      return;
    }
    if (user.status && user.status !== 'approved') {
      toast.info('Your registration is pending admin approval. You can schedule a visit after approval.');
      navigate('/application-status', { state: { mobile: user.mobile, intent: 'schedule-visit' } });
      return;
    }
    navigate(target);
  }, [user, property, propertyId, navigate]);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: property.titleEn, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      toast.success('Link copied to clipboard.');
    }
  }

  function handleReport() {
    toast.success('Thank you. This property has been reported to our moderation team.');
  }

  function handleFavourite() {
    if (!user) {
      toast.info('Please login to save properties.');
      return;
    }
    toggleFavourite(user.id, property.id);
  }

  function handleCompare() {
    const result = toggleCompare(property.id);
    if (!result.ok && result.reason === 'maxReached') {
      toast.error(t('compare.maxReached', { ns: 'dashboard' }));
    } else if (!result.ok && result.reason === 'alreadyAdded') {
      toast.info(t('compare.alreadyAdded', { ns: 'dashboard' }));
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState titleKey="empty.noResults" />
      </div>
    );
  }

  if (!property) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-500">{t('loading', { ns: 'common' })}</div>;
  }

  const title = getLocalizedField(property, 'title', language);
  const location = getLocalizedField(property, 'location', language);
  const description = getLocalizedField(property, 'description', language);

  const facts = [
    ...(property.structure
      ? [
          [t('detail.bedroomsLabel'), property.structure.bedrooms],
          [t('detail.bathroomsLabel'), property.structure.bathrooms],
          [t('detail.hallsLabel'), property.structure.halls],
          [t('detail.balconiesLabel'), property.structure.balconies],
          [t('detail.facingLabel'), property.facing ? null : property.structure.facing],
          [t('detail.furnishingLabel'), property.structure.furnishing],
          [t('detail.parkingLabel'), property.structure.parking],
          [t('detail.floorLabel'), `${property.structure.propertyFloor}/${property.structure.floors}`],
          [t('detail.ageLabel'), property.structure.ageOfProperty],
        ]
      : []),
    ...(property.plotDetails
      ? Object.entries(property.plotDetails).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])
      : []),
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  const hasDimensions = Boolean(
    property.area
    || property.facing
    || property.northMeasurement
    || property.eastMeasurement
    || property.westMeasurement
    || property.southMeasurement
  );

  const facingDisplay = property.facing || property.structure?.facing || property.plotDetails?.facing || '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 lg:pb-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <Link to="/" className="hover:underline">{t('breadcrumb.home')}</Link>
        <ChevronRight size={14} />
        <Link to={`/properties/category/${property.categorySlug}`} className="hover:underline">
          {t('breadcrumb.properties')}
        </Link>
        <ChevronRight size={14} />
        <span className="line-clamp-1 font-medium text-brand-800">{title}</span>
      </nav>

      <PromotionsCarousel compact propertyId={property.id} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <ImageGallery images={property.images} title={title} />

          <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2">
                {(property.isReserved || property.status === 'booked') && (
                  <span className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-warm-white">
                    Reserved / Booked
                  </span>
                )}
                {(property.isSold || property.status === 'sold') && (
                  <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs font-semibold text-warm-white">
                    Sold
                  </span>
                )}
                {property.verified && (
                  <span className="flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-1 text-xs font-semibold text-warm-white">
                    <BadgeCheck size={13} /> {t('card.verified')}
                  </span>
                )}
                {property.featured && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-warm-white">
                    <Star size={13} /> {t('card.featured')}
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-brand-800">{title}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={15} /> <span className="lang-te">{location}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleFavourite} aria-pressed={isFavourite} className="rounded-full border border-gray-200 p-2.5 hover:bg-gray-50" aria-label="Save property">
                <Heart size={18} fill={isFavourite ? 'currentColor' : 'none'} className={isFavourite ? 'text-red-500' : 'text-gray-500'} />
              </button>
              <button
                type="button"
                onClick={handleCompare}
                aria-pressed={isComparing}
                aria-label={isComparing ? t('compare.removeFromCompare', { ns: 'dashboard' }) : t('compare.addToCompare', { ns: 'dashboard' })}
                className={`rounded-full border p-2.5 ${isComparing ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <Scale size={18} />
              </button>
              <button type="button" onClick={handleShare} aria-label={t('buttons.shareProperty', { ns: 'common' })} className="rounded-full border border-gray-200 p-2.5 hover:bg-gray-50">
                <Share2 size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          <p className="mt-3 text-2xl font-bold text-brand-700">
            {formatPrice(property)} {property.priceNegotiable && <span className="ml-2 text-sm font-normal text-gray-500">({t('detail.negotiable')})</span>}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <span>{t('detail.propertyId')}: {property.propertyCode}</span>
            <span>{t('detail.postedDate')}: {new Date(property.postedDate).toLocaleDateString()}</span>
            <span>{t('detail.updatedDate')}: {new Date(property.updatedDate).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><Eye size={14} /> {t('detail.views', { count: property.views })}</span>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-800">{t('detail.description')}</h2>
            <p className="mt-2 whitespace-pre-line text-gray-700 lang-te">{description}</p>
          </section>

          {hasDimensions && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-brand-800">
                {t('detail.propertyDimensions', { defaultValue: 'Property Dimensions' })}
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {property.area && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">{t('detail.areaLabel')}</dt>
                    <dd className="text-sm font-medium text-gray-800">{property.area}</dd>
                  </div>
                )}
                {facingDisplay && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">{t('detail.facingLabel')}</dt>
                    <dd className="text-sm font-medium text-gray-800">{facingDisplay}</dd>
                  </div>
                )}
              </dl>
              {(property.northMeasurement || property.eastMeasurement || property.westMeasurement || property.southMeasurement) && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t('detail.measurements', { defaultValue: 'Measurements' })}
                  </h3>
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                    {[
                      ['North', property.northMeasurement],
                      ['East', property.eastMeasurement],
                      ['West', property.westMeasurement],
                      ['South', property.southMeasurement],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
                        <dd className="text-sm font-medium text-gray-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </section>
          )}

          {facts.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-brand-800">{t('detail.facts')}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
                    <dd className="text-sm font-medium text-gray-800">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {property.amenities?.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-brand-800">{t('detail.amenities')}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-800">{a}</span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-800">{t('detail.nearbyLandmarks')}</h2>
            <p className="mt-2 text-sm text-gray-600">
              {property.city} {t('breadcrumb.properties')} &middot; {property.district}, {property.state}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-brand-800">{t('detail.locationMap')}</h2>
            <div className="mt-3 flex h-56 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
              {t('detail.mapPlaceholder')}
            </div>
          </section>

          <button
            type="button"
            onClick={handleReport}
            className="mt-8 flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
          >
            <Flag size={15} /> {t('buttons.reportProperty', { ns: 'common' })}
          </button>

          <p className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">{cms ? getLocalizedField(cms, 'disclaimer', language) : t('detail.disclaimer')}</p>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-3 rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-brand-800">
              {property.sellerId?.startsWith('u-mediator') ? t('detail.contactMediator') : t('detail.contactSeller')}
            </h2>
            <p className="text-sm text-gray-600">{property.contactName}</p>
            <a href={buildTelLink(property.contactPhone)} className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700">
              <Phone size={16} /> {t('buttons.call', { ns: 'common' })}
            </a>
            <a
              href={buildWhatsAppLink(property, { lang: language })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-green-700"
            >
              <MessageCircle size={16} /> {t('buttons.whatsapp', { ns: 'common' })}
            </a>
            <button type="button" onClick={handleExpressInterest} className="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-500 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              <HandHeart size={16} /> {t('buttons.expressInterest', { ns: 'common' })}
            </button>
            <button
              type="button"
              onClick={handleScheduleVisit}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <CalendarPlus size={16} /> {t('buttons.scheduleVisit', { ns: 'common' })}
            </button>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-brand-800">{t('detail.relatedProperties')}</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-gray-200 bg-warm-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] sm:grid-cols-4 lg:hidden">
        <a href={buildTelLink(property.contactPhone)} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white">
          <Phone size={16} /> {t('buttons.call', { ns: 'common' })}
        </a>
        <a
          href={buildWhatsAppLink(property, { lang: language })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-warm-white"
        >
          <MessageCircle size={16} /> {t('buttons.whatsapp', { ns: 'common' })}
        </a>
        <button type="button" onClick={handleExpressInterest} className="flex items-center justify-center gap-1.5 rounded-lg border border-brand-500 py-2.5 text-sm font-semibold text-brand-700">
          <HandHeart size={16} /> {t('buttons.expressInterest', { ns: 'common' })}
        </button>
        <button type="button" onClick={handleScheduleVisit} className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700">
          <CalendarPlus size={16} /> {t('buttons.scheduleVisit', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
}
