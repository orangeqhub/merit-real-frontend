import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, RotateCcw, Search } from 'lucide-react';
import { promotionService, PROMOTION_TYPES } from '../../services/promotionService';
import { resolveAssetUrl } from '../../api/client';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';
import { restorePromotionLocally } from '../../utils/dismissedPromotions';

export default function BuyerMyPromotions() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const list = await promotionService.myPromotions({ status, type, sort, search });
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load promotions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, type, sort]);

  async function handleSearch(e) {
    e.preventDefault();
    await load();
  }

  async function handleRestore(id) {
    try {
      await promotionService.restore(id);
      restorePromotionLocally(id);
      toast.success('Promotion restored.');
      await load();
    } catch (err) {
      toast.error(err.message || 'Restore failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-800">
          <Megaphone size={22} />
          {t('promotions.myTitle', { defaultValue: 'My Promotions' })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('promotions.mySubtitle', { defaultValue: 'View active, dismissed, and expired promotional offers.' })}
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm"
              placeholder="Title, property, type…"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="active">Active</option>
            <option value="dismissed">Dismissed</option>
            <option value="expired">Expired</option>
            <option value="all">All</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">All types</option>
            {PROMOTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="newest">Newest</option>
            <option value="type">Type</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-800">
          Apply
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState titleKey="empty.noResults" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="relative h-36 bg-gray-100">
                <img
                  src={resolveAssetUrl(item.bannerImage) || resolveAssetUrl(item.property?.image)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded bg-brand-800/90 px-2 py-0.5 text-[11px] font-semibold uppercase text-warm-white">
                  {item.promotionTypeLabel}
                </span>
                {item.dismissed && (
                  <span className="absolute right-3 top-3 rounded bg-gray-900/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Dismissed
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-brand-900">{item.title}</h3>
                <p className="mt-0.5 text-sm text-brand-700 truncate">{item.property?.titleEn}</p>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/properties/${item.primaryPropertyId}`}
                    className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-warm-white hover:bg-brand-800"
                  >
                    {item.ctaButtonText || 'View Property'}
                  </Link>
                  {item.dismissed && (
                    <button
                      type="button"
                      onClick={() => handleRestore(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                    >
                      <RotateCcw size={12} /> Reopen
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
