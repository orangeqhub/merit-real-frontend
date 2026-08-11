import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, ChevronRight } from 'lucide-react';
import { getCategoryBySlug } from '../../config/categories';
import { useLanguageStore } from '../../store/languageStore';
import { propertyService } from '../../services/propertyService';
import { categoryService } from '../../services/categoryService';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { haversineDistanceKm, getPropertyCoordinates } from '../../utils/geo';
import PropertyCard from '../../components/properties/PropertyCard';
import FilterPanel from '../../components/properties/FilterPanel';
import MobileFilterDrawer from '../../components/properties/MobileFilterDrawer';
import { PropertyCardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import PromotionsCarousel from '../../components/promotions/PromotionsCarousel';

const PAGE_SIZE = 9;

export default function PropertyListing({ forcedCategorySlug }) {
  const { t } = useTranslation('properties');
  const { categorySlug: routeCategorySlug } = useParams();
  const categorySlug = forcedCategorySlug || routeCategorySlug;
  const [searchParams] = useSearchParams();
  const language = useLanguageStore((s) => s.language);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const userCoords = useUserLocationStore((s) => s.coords);
  const geoStatus = useUserLocationStore((s) => s.status);
  const [category, setCategory] = useState(categorySlug ? getCategoryBySlug(categorySlug) : null);

  const [filters, setFilters] = useState(() => ({
    city: searchParams.get('city') || selectedLocation || undefined,
    transactionType: searchParams.get('transactionType') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    search: searchParams.get('search') || undefined,
    trending: searchParams.get('section') === 'trending' || undefined,
  }));
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryService.getPublicCategories().catch(() => {});
  }, []);

  useEffect(() => {
    if (!categorySlug) {
      setCategory(null);
      return;
    }
    const cached = getCategoryBySlug(categorySlug);
    if (cached) setCategory(cached);
    categoryService.getCategoryBySlug(categorySlug).then(setCategory).catch(() => {
      setCategory(cached || null);
    });
  }, [categorySlug]);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      categorySlug: category ? category.slug : (categorySlug || filters.categorySlug),
      sort,
      page,
      pageSize: PAGE_SIZE * page,
      featured: sort === 'featured' || undefined,
      trending: filters.trending || undefined,
    }),
    [filters, category, categorySlug, sort, page]
  );

  useEffect(() => {
    setLoading(true);
    propertyService.getProperties({ ...effectiveFilters, page: 1 }).then((res) => {
      setResult(res);
      setLoading(false);
    }).catch(() => {
      setResult({ items: [], total: 0 });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFilters]);

  useEffect(() => {
    setPage(1);
  }, [filters, category?.slug, sort]);

  function handleReset() {
    setFilters({});
  }

  // Purely a display-layer reorder of the already-fetched page — never
  // touches propertyService or the `sort` dropdown's own logic. Properties
  // with a resolvable distance (nearby) always come first, nearest first;
  // properties whose city has no known coordinates keep their existing
  // relative order at the end.
  const displayItems = useMemo(() => {
    if (!result?.items) return [];
    if (!userCoords) return result.items;
    const withDistance = result.items.map((p) => {
      const coords = getPropertyCoordinates(p);
      const distanceKm = coords ? haversineDistanceKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng) : null;
      return distanceKm != null ? { ...p, distanceKm } : p;
    });
    const nearby = withDistance.filter((p) => p.distanceKm != null).sort((a, b) => a.distanceKm - b.distanceKm);
    const remaining = withDistance.filter((p) => p.distanceKm == null);
    return [...nearby, ...remaining];
  }, [result, userCoords]);

  const title = category ? (language === 'te' ? category.nameTe : category.nameEn) : t('breadcrumb.properties');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
        <Link to="/" className="hover:underline">{t('breadcrumb.home')}</Link>
        <ChevronRight size={14} />
        <span className="font-medium text-brand-800">{title}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-800">{title}</h1>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium lg:hidden"
        >
          <SlidersHorizontal size={16} /> {t('filters.openFilters')}
        </button>
      </div>

      <div className="mt-5">
        <PromotionsCarousel compact />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-gray-200 p-4">
            <h2 className="mb-4 font-semibold text-brand-800">{t('filters.title')}</h2>
            <FilterPanel filters={filters} onChange={setFilters} onReset={handleReset} hideCategory={Boolean(category)} />
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <p className="text-sm text-gray-500">
              {result ? t('category.properties', { count: result.total }) : ''}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-gray-500">{t('sort.label')}</label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="newest">{t('sort.newest')}</option>
                <option value="price-asc">{t('sort.priceLowToHigh')}</option>
                <option value="price-desc">{t('sort.priceHighToLow')}</option>
                <option value="most-viewed">{t('sort.mostViewed')}</option>
                <option value="featured">{t('sort.featured')}</option>
              </select>
            </div>
          </div>

          {!loading && geoStatus === 'denied' && (
            <p className="mt-3 text-sm text-gray-500">{t('location.deniedHint', { ns: 'common' })}</p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)}
            {!loading && displayItems.length === 0 && (
              <div className="col-span-full">
                <EmptyState titleKey="empty.noResults" hintKey="empty.noResultsHint" />
              </div>
            )}
            {!loading && displayItems.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>

          {!loading && result && result.items.length < result.total && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-brand-500 px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                {t('buttons.loadMore', { ns: 'common' })}
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
        hideCategory={Boolean(category)}
      />
    </div>
  );
}
