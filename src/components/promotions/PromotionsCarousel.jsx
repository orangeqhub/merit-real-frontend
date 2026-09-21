import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  Sparkles,
  Star,
  X,
  ArrowUpRight,
  CalendarClock,
} from 'lucide-react';
import { promotionService } from '../../services/promotionService';
import { resolveAssetUrl } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { usePromotionUiStore } from '../../store/promotionUiStore';
import {
  clearLegacyDismissals,
  savePromotionForLaterLocally,
} from '../../utils/dismissedPromotions';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

const AUTOPLAY_MS = 6000;

const TYPE_STYLES = {
  TRENDING_PROPERTY: {
    badge: 'bg-amber-400 text-gray-900',
    cta: 'bg-amber-400 text-gray-900 hover:bg-amber-300',
    cardBadge: 'bg-amber-400 text-gray-900',
    Icon: Flame,
    label: 'Trending Property',
  },
  FEATURED_PROPERTY: {
    badge: 'bg-emerald-500 text-white',
    cta: 'bg-emerald-500 text-white hover:bg-emerald-400',
    cardBadge: 'bg-emerald-500 text-white',
    Icon: Star,
    label: 'Featured',
  },
  HOT_PROPERTY: {
    badge: 'bg-orange-500 text-white',
    cta: 'bg-orange-500 text-white hover:bg-orange-400',
    cardBadge: 'bg-orange-500 text-white',
    Icon: Flame,
    label: 'Hot Offer',
  },
  LIMITED_TIME_OFFER: {
    badge: 'bg-rose-500 text-white',
    cta: 'bg-rose-500 text-white hover:bg-rose-400',
    cardBadge: 'bg-rose-500 text-white',
    Icon: Flame,
    label: 'Limited Offer',
  },
  NEW_LAUNCH: {
    badge: 'bg-violet-600 text-white',
    cta: 'bg-violet-600 text-white hover:bg-violet-500',
    cardBadge: 'bg-violet-600 text-white',
    Icon: ArrowUpRight,
    label: 'New Launch',
  },
  PREMIUM_LISTING: {
    badge: 'bg-brand-700 text-white',
    cta: 'bg-brand-700 text-white hover:bg-brand-600',
    cardBadge: 'bg-brand-700 text-white',
    Icon: Sparkles,
    label: 'Premium Listing',
  },
  FESTIVAL_OFFER: {
    badge: 'bg-fuchsia-600 text-white',
    cta: 'bg-fuchsia-600 text-white hover:bg-fuchsia-500',
    cardBadge: 'bg-fuchsia-600 text-white',
    Icon: Sparkles,
    label: 'Festival Offer',
  },
};

function typeStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.FEATURED_PROPERTY;
}

function useCountdown(endDate) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    if (!endDate) {
      setParts(null);
      return undefined;
    }
    function tick() {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setParts({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setParts({ days, hours, mins, secs, expired: false });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return parts;
}

function CountdownBlock({ endDate, compact = false }) {
  const parts = useCountdown(endDate);
  if (!parts || parts.expired) return null;
  const cells = [
    { label: 'Days', value: parts.days },
    { label: 'Hours', value: parts.hours },
    { label: 'Mins', value: parts.mins },
    { label: 'Secs', value: parts.secs },
  ];
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <p className={`flex items-center gap-1.5 font-medium text-white/90 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <CalendarClock size={compact ? 12 : 14} /> Offer Ends In
      </p>
      <div className="flex gap-1.5 sm:gap-2">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={`rounded-md bg-black/40 text-center backdrop-blur-sm ${compact ? 'min-w-[42px] px-1.5 py-1' : 'min-w-[52px] px-2 py-1.5'}`}
          >
            <div className={`font-bold tabular-nums text-white ${compact ? 'text-sm' : 'text-base'}`}>
              {String(cell.value).padStart(2, '0')}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-white/70">{cell.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroBanner({ item, onClose, onSaveForLater, onPrev, onNext, showNav, index, total }) {
  const style = typeStyle(item.promotionType);
  const Icon = style.Icon;
  const banner = resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image);
  const ctaTo = `/properties/${item.primaryPropertyId}`;
  const offerPrice = formatIndianCurrency(item.offerPrice, { maximumFractionDigits: 0, fallback: null });
  const location = [item.property?.locality, item.property?.city].filter(Boolean).join(', ');
  const highlights = (item.description || '')
    .split(/[|•\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg min-h-[240px] sm:min-h-[340px] lg:min-h-[400px]">
      {banner ? (
        <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-brand-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/25" />

      {offerPrice && (
        <div className="absolute -right-8 top-8 rotate-45 bg-rose-600 px-10 py-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-md sm:text-xs">
          Offer {offerPrice}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm hover:bg-black/60"
        aria-label="Hide for now"
        title="Hide for now — will show again after refresh"
      >
        <X size={16} />
      </button>

      <div className="relative z-10 flex h-full flex-col justify-between gap-4 p-4 sm:gap-6 sm:p-7 lg:p-8">
        <div className="max-w-2xl">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${style.badge}`}>
            <Icon size={13} />
            {item.promotionTypeLabel || style.label}
          </span>
          <h3 className="mt-2 text-xl font-bold leading-tight text-white sm:mt-3 sm:text-3xl lg:text-4xl">
            {item.title}
          </h3>
          {item.property?.titleEn && item.property.titleEn !== item.title && (
            <p className="mt-1 text-base font-semibold text-amber-300 sm:text-lg">{item.property.titleEn}</p>
          )}
          {highlights.length > 0 && (
            <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {highlights.map((line) => (
                <li key={line} className="text-sm text-white/90">• {line}</li>
              ))}
            </ul>
          )}
          {location && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin size={14} /> {location}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="rounded-xl bg-black/45 p-2.5 backdrop-blur-md sm:min-w-[260px] sm:p-3">
            <CountdownBlock endDate={item.endDate} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={ctaTo}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${style.cta}`}
              >
                {item.ctaButtonText || 'View Property'} →
              </Link>
              <button
                type="button"
                onClick={onSaveForLater}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25"
              >
                <Bell size={14} /> Save for later
              </button>
            </div>
          </div>

          {showNav && (
            <div className="flex items-center gap-2 self-end">
              <button type="button" onClick={onPrev} className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30" aria-label="Previous">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-medium text-white/80">{index + 1}/{total}</span>
              <button type="button" onClick={onNext} className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30" aria-label="Next">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactCard({ item, onClose, onSaveForLater }) {
  const style = typeStyle(item.promotionType);
  const Icon = style.Icon;
  const banner = resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image);
  const ctaTo = `/properties/${item.primaryPropertyId}`;
  const location = [item.property?.locality, item.property?.city].filter(Boolean).join(', ');

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative h-36">
        {banner ? (
          <img src={banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full bg-brand-100" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${style.badge}`}>
          <Icon size={11} /> {item.promotionTypeLabel || style.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
          aria-label="Hide for now"
        >
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-bold text-brand-900">{item.title}</h3>
        {item.description && <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>}
        {location && (
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} /> {location}
          </p>
        )}
        <CountdownBlock endDate={item.endDate} compact />
        <Link
          to={ctaTo}
          className={`mt-1 inline-flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2.5 text-sm font-bold ${style.cta}`}
        >
          {item.ctaButtonText || 'View Property'} →
        </Link>
        <button
          type="button"
          onClick={onSaveForLater}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          <Bell size={13} /> Save for later in Notifications
        </button>
      </div>
    </div>
  );
}

function ExploreCards({ items }) {
  const scrollerRef = useRef(null);

  function scrollBy(dir) {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  }

  if (!items.length) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h3 className="text-base font-bold text-brand-900 sm:text-xl">Explore Top Promotions</h3>
        <Link to="/properties?sort=featured" className="text-sm font-semibold text-brand-700 hover:underline">
          View All →
        </Link>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md sm:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} />
        </button>
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {items.map((item) => {
            const style = typeStyle(item.promotionType);
            const Icon = style.Icon;
            const image = resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image);
            const price = formatIndianCurrency(item.offerPrice, { maximumFractionDigits: 0, fallback: null })
              || formatIndianCurrency(item.property?.price, { maximumFractionDigits: 0, fallback: null });
            return (
              <Link
                key={item.id}
                to={`/properties/${item.primaryPropertyId}`}
                className="group relative h-48 w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl shadow-md sm:h-56 sm:w-[260px]"
              >
                {image ? (
                  <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-brand-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${style.cardBadge}`}>
                  <Icon size={11} /> {item.promotionTypeLabel || style.label}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h4 className="font-bold leading-snug line-clamp-2">{item.title}</h4>
                  {item.property?.titleEn && (
                    <p className="mt-0.5 text-xs text-white/80 line-clamp-1">{item.property.titleEn}</p>
                  )}
                  {price && <p className="mt-1 text-sm font-semibold text-amber-300">Starting From {price}</p>}
                  <span className={`mt-3 inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${style.cta}`}>
                    {item.ctaButtonText || 'Explore Now'} →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 shadow-md sm:flex"
          aria-label="Scroll right"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default function PromotionsCarousel({
  className = '',
  compact = false,
  title = 'Featured Offers & Promotions',
  subtitle = '',
  propertyId = null,
  showExplore = true,
}) {
  const { user } = useAuthStore();
  const openFloating = usePromotionUiStore((s) => s.openFloating);
  const floatingMode = usePromotionUiStore((s) => s.mode);
  const floatingPromotionId = usePromotionUiStore((s) => s.promotionId);
  const [items, setItems] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    clearLegacyDismissals();
    try {
      let list = await promotionService.listActive();
      list = Array.isArray(list) ? list : [];
      if (propertyId) {
        const pid = Number(propertyId);
        list = list.filter(
          (p) => Number(p.primaryPropertyId) === pid
            || (p.propertyIds || []).map(Number).includes(pid)
        );
      }
      setItems(list);
      setIndex(0);
      const { mode, promotionId: floatId } = usePromotionUiStore.getState();
      if ((mode === 'open' || mode === 'minimized') && floatId) {
        setHiddenIds(new Set([Number(floatId)]));
      } else {
        setHiddenIds(new Set());
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if ((floatingMode === 'open' || floatingMode === 'minimized') && floatingPromotionId) {
      setHiddenIds((prev) => new Set([...prev, Number(floatingPromotionId)]));
    }
  }, [floatingMode, floatingPromotionId]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => items.filter((p) => !hiddenIds.has(p.id)),
    [items, hiddenIds]
  );

  useEffect(() => {
    if (index >= visible.length) setIndex(0);
  }, [visible.length, index]);

  useEffect(() => {
    if (paused || visible.length <= 1) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % visible.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, visible.length, index]);

  const current = visible[index] || null;

  /** Close banner → show floating trending popup (not permanently gone). */
  function handleClose(promo) {
    if (!promo) return;
    setHiddenIds((prev) => new Set([...prev, promo.id]));
    openFloating(promo);
  }

  /** Save for later → My Promotions; also open minimized floating so it stays reachable. */
  async function handleSaveForLater(promo) {
    if (!promo) return;
    setHiddenIds((prev) => new Set([...prev, promo.id]));
    openFloating(promo);
    usePromotionUiStore.getState().minimize();
    const isCustomer = user && (user.role === 'customer' || user.role === 'buyer');
    if (isCustomer) {
      try {
        await promotionService.dismiss(promo.id);
        toast.success('Saved to My Promotions. You can reopen it anytime.');
      } catch {
        savePromotionForLaterLocally(promo.id);
        toast.success('Saved for later.');
      }
    } else {
      savePromotionForLaterLocally(promo.id);
      toast.info('Login as a customer to keep promotions in My Promotions.');
    }
  }

  function go(delta) {
    if (!visible.length) return;
    setIndex((i) => (i + delta + visible.length) % visible.length);
  }

  if (loading || !current) return null;

  return (
    <div
      className={`${compact ? 'mb-4' : 'mb-10'} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {!compact && (title || subtitle) && (
        <div className="mb-4">
          {title ? <h2 className="text-lg font-bold text-brand-800 sm:text-xl md:text-xl">{title}</h2> : null}
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      )}

      {compact ? (
        <CompactCard
          item={current}
          onClose={() => handleClose(current)}
          onSaveForLater={() => handleSaveForLater(current)}
        />
      ) : (
        <HeroBanner
          item={current}
          onClose={() => handleClose(current)}
          onSaveForLater={() => handleSaveForLater(current)}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          showNav={visible.length > 1}
          index={index}
          total={visible.length}
        />
      )}

      {visible.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {visible.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Go to promotion ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand-700' : 'w-1.5 bg-brand-200'}`}
            />
          ))}
        </div>
      )}

      {!compact && showExplore && items.length > 0 && <ExploreCards items={items} />}
    </div>
  );
}
