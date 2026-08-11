import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CATEGORIES } from '../../config/categories';
import { CITIES } from '../../data/locations';
import { heroSlideService } from '../../services/heroSlideService';
import { categoryService } from '../../services/categoryService';
import { resolveAssetUrl } from '../../api/client';
import { useLanguageStore } from '../../store/languageStore';
import { useUserLocationStore } from '../../store/userLocationStore';

const AUTOPLAY_INTERVAL = 3000;
const CURRENT_LOCATION_VALUE = '__current_location__';

export default function HeroCarousel() {
  const { t } = useTranslation(['properties', 'common']);
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const userLocation = useUserLocationStore();
  const [slides, setSlides] = useState([]);
  const [categories, setCategories] = useState(CATEGORIES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(typeof document !== 'undefined' && document.hidden);
  const touchStartX = useRef(null);
  const [form, setForm] = useState({ location: '', categorySlug: '', minPrice: '', maxPrice: '' });

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    heroSlideService.listActive()
      .then((list) => setSlides(Array.isArray(list) ? list : []))
      .catch(() => setSlides([]));
    categoryService.getPublicCategories()
      .then((list) => setCategories(Array.isArray(list) ? list : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    function handleVisibility() {
      setTabHidden(document.hidden);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (paused || focused || tabHidden || slides.length <= 1) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_INTERVAL);
    return () => clearInterval(id);
  }, [paused, focused, tabHidden, index, slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  function goTo(i) {
    if (!slides.length) return;
    setIndex((i + slides.length) % slides.length);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(index + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }

  function handleFocusCapture() {
    setFocused(true);
  }

  function handleBlurCapture(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  }

  useEffect(() => {
    if (userLocation.label) {
      setForm((f) => ({ ...f, location: userLocation.label }));
    }
  }, [userLocation.label]);

  function handleLocationChange(e) {
    const value = e.target.value;
    if (value === CURRENT_LOCATION_VALUE) {
      userLocation.requestLocation();
      return;
    }
    setForm((f) => ({ ...f, location: value }));
  }

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.location) params.set('city', form.location);
    params.set('transactionType', 'sale');
    if (form.minPrice) params.set('minPrice', form.minPrice);
    if (form.maxPrice) params.set('maxPrice', form.maxPrice);
    const category = categories.find((c) => c.slug === form.categorySlug);
    if (category) {
      navigate(`/properties/category/${category.slug}?${params.toString()}`);
    } else {
      navigate(`/properties?${params.toString()}`);
    }
  }

  const slide = slides[index] || slides[0];
  const heading = slide
    ? (language === 'te' ? (slide.headingTe || slide.headingEn) : slide.headingEn) || t('hero.heading')
    : t('hero.heading');
  const subtitle = slide
    ? (language === 'te' ? (slide.subtitleTe || slide.subtitleEn) : slide.subtitleEn) || ''
    : '';

  return (
    <section
      className="relative h-[560px] w-full overflow-hidden sm:h-[620px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={resolveAssetUrl(s.image)}
          alt=""
          aria-hidden={i !== index}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
            prefersReducedMotion ? 'duration-0' : 'duration-700'
          } ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t('hero.previousSlide', { ns: 'properties', defaultValue: 'Previous slide' })}
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-warm-white/20 p-2 text-warm-white hover:bg-warm-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warm-white sm:flex"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t('hero.nextSlide', { ns: 'properties', defaultValue: 'Next slide' })}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-warm-white/20 p-2 text-warm-white hover:bg-warm-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warm-white sm:flex"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-warm-white ${
                i === index ? 'w-6 bg-warm-white' : 'w-2 bg-warm-white/50'
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-3xl text-3xl font-bold text-warm-white drop-shadow sm:text-5xl">{heading}</h1>
        {subtitle && <p className="lang-te mt-3 max-w-2xl text-sm text-warm-white/90 drop-shadow sm:text-base">{subtitle}</p>}

        <form
          onSubmit={handleSearch}
          className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-2 rounded-2xl bg-warm-white/95 p-3 shadow-xl sm:grid-cols-2 lg:grid-cols-5"
        >
          <select
            value={form.location}
            onChange={handleLocationChange}
            aria-label={t('hero.locationPlaceholder')}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
          >
            <option value="">{t('hero.locationPlaceholder')}</option>
            <option value={CURRENT_LOCATION_VALUE}>
              {userLocation.status === 'loading'
                ? t('location.detecting', { ns: 'common' })
                : t('location.useCurrentLocation', { ns: 'common' })}
            </option>
            {userLocation.label && (
              <option value={userLocation.label}>{t('location.detected', { ns: 'common', label: userLocation.label })}</option>
            )}
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={form.categorySlug}
            onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}
            aria-label={t('hero.categoryPlaceholder')}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
          >
            <option value="">{t('hero.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{language === 'te' ? c.nameTe : c.nameEn}</option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={form.minPrice}
            onChange={(e) => setForm((f) => ({ ...f, minPrice: e.target.value }))}
            placeholder={t('hero.minPricePlaceholder')}
            aria-label={t('hero.minPricePlaceholder')}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
          />
          <input
            type="number"
            min="0"
            value={form.maxPrice}
            onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
            placeholder={t('hero.maxPricePlaceholder')}
            aria-label={t('hero.maxPricePlaceholder')}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
          />

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700"
          >
            <Search size={16} /> {t('buttons.search', { ns: 'common' })}
          </button>
        </form>
      </div>
    </section>
  );
}
