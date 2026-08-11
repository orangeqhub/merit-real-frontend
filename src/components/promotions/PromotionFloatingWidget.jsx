import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Flame, MapPin, Minimize2, Star, Sparkles, ArrowUpRight, X } from 'lucide-react';
import { promotionService } from '../../services/promotionService';
import { resolveAssetUrl } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { usePromotionUiStore } from '../../store/promotionUiStore';
import { toast } from '../../store/toastStore';
import { savePromotionForLaterLocally } from '../../utils/dismissedPromotions';

const TYPE_META = {
  TRENDING_PROPERTY: { Icon: Flame, label: 'Trending Property', cta: 'bg-amber-400 hover:bg-amber-300 text-gray-900' },
  FEATURED_PROPERTY: { Icon: Star, label: 'Featured Property', cta: 'bg-amber-400 hover:bg-amber-300 text-gray-900' },
  HOT_PROPERTY: { Icon: Flame, label: 'Hot Property', cta: 'bg-orange-500 hover:bg-orange-400 text-white' },
  LIMITED_TIME_OFFER: { Icon: Flame, label: 'Limited Offer', cta: 'bg-rose-500 hover:bg-rose-400 text-white' },
  NEW_LAUNCH: { Icon: ArrowUpRight, label: 'New Launch', cta: 'bg-violet-600 hover:bg-violet-500 text-white' },
  PREMIUM_LISTING: { Icon: Sparkles, label: 'Premium Listing', cta: 'bg-brand-700 hover:bg-brand-600 text-white' },
  FESTIVAL_OFFER: { Icon: Sparkles, label: 'Festival Offer', cta: 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' },
};

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
        setParts(null);
        return;
      }
      setParts({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return parts;
}

export default function PromotionFloatingWidget() {
  const { user } = useAuthStore();
  const {
    mode,
    promotionId,
    promotion,
    minimize,
    expand,
    closeFloating,
    setPromotion,
  } = usePromotionUiStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'closed') return undefined;
    if (promotion && Number(promotion.id) === Number(promotionId)) return undefined;
    if (!promotionId) return undefined;

    let cancelled = false;
    setLoading(true);
    promotionService
      .listActive()
      .then((list) => {
        if (cancelled) return;
        const found = (Array.isArray(list) ? list : []).find((p) => Number(p.id) === Number(promotionId));
        if (found) setPromotion(found);
        else closeFloating();
      })
      .catch(() => {
        if (!cancelled) closeFloating();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [mode, promotionId, promotion, setPromotion, closeFloating]);

  const item = promotion;
  const countdown = useCountdown(item?.endDate);
  const meta = TYPE_META[item?.promotionType] || TYPE_META.TRENDING_PROPERTY;
  const Icon = meta.Icon;
  const image = item ? (resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image)) : null;
  const location = item
    ? [item.property?.locality, item.property?.city].filter(Boolean).join(', ')
    : '';
  const ctaTo = item ? `/properties/${item.primaryPropertyId}` : '/properties';

  async function handleSaveForLater() {
    if (!item) return;
    const isCustomer = user && (user.role === 'customer' || user.role === 'buyer');
    if (isCustomer) {
      try {
        await promotionService.dismiss(item.id);
        toast.success('Saved to My Promotions / Notifications.');
      } catch {
        savePromotionForLaterLocally(item.id);
        toast.success('Saved for later.');
      }
    } else {
      savePromotionForLaterLocally(item.id);
      toast.info('Login as a customer to keep it in My Promotions.');
    }
    minimize();
  }

  if (mode === 'closed' || (!item && !loading)) return null;

  if (mode === 'minimized') {
    return (
      <div className="fixed bottom-5 right-4 z-[60] sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={expand}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-xl ring-1 ring-black/5 transition hover:scale-[1.02]"
          aria-label="Expand promotion"
        >
          <span className="text-base" aria-hidden>🔥</span>
          <span className="max-w-[140px] truncate">{item?.promotionTypeLabel || meta.label}</span>
        </button>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="fixed bottom-4 right-3 z-[60] w-[min(100vw-1.5rem,320px)] sm:bottom-6 sm:right-6">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-gray-900">
            <span aria-hidden>🔥</span>
            <Icon size={14} className="text-orange-500" />
            <span>{item.promotionTypeLabel || meta.label}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={minimize}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Minimize"
              title="Minimize"
            >
              <Minimize2 size={15} />
            </button>
            <button
              type="button"
              onClick={closeFloating}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-4">
          <div className="overflow-hidden rounded-xl bg-gray-100">
            {image ? (
              <img src={image} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-gray-400">Promotion</div>
            )}
          </div>
        </div>

        <div className="space-y-3 px-4 pt-3 pb-4">
          <div>
            <h3 className="text-lg font-bold leading-snug text-gray-900">{item.title}</h3>
            {item.description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{item.description}</p>
            )}
            {location && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} className="shrink-0" />
                {location}
              </p>
            )}
          </div>

          {countdown && (
            <div className="rounded-xl bg-[#F7F1E4] px-3 py-2.5 text-center">
              <p className="text-[11px] font-medium text-gray-600">Offer Ends In</p>
              <div className="mt-1.5 grid grid-cols-4 divide-x divide-black/10">
                {[
                  { label: 'Days', value: countdown.days },
                  { label: 'Hours', value: countdown.hours },
                  { label: 'Mins', value: countdown.mins },
                  { label: 'Secs', value: countdown.secs },
                ].map((cell) => (
                  <div key={cell.label} className="px-1">
                    <div className="text-base font-bold tabular-nums text-gray-900">
                      {String(cell.value).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-gray-500">{cell.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            to={ctaTo}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${meta.cta}`}
          >
            {item.ctaButtonText || 'View Property'} →
          </Link>

          <button
            type="button"
            onClick={handleSaveForLater}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Bell size={14} />
            Save for later in Notifications
          </button>
        </div>
      </div>
    </div>
  );
}
