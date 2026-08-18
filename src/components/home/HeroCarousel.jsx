import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Crosshair, Search } from 'lucide-react';
import { CATEGORIES } from '../../config/categories';
import { heroSlideService } from '../../services/heroSlideService';
import { categoryService } from '../../services/categoryService';
import { resolveAssetUrl } from '../../api/client';
import { useLanguageStore } from '../../store/languageStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { HERO_IMAGES } from '../../data/projectImages';

const AUTOPLAY_INTERVAL = 3000;

export default function HeroCarousel() {
  const { t } = useTranslation(['properties', 'common']);
  const navigate = useNavigate();
  const language = useLanguageStore((s) => s.language);
  const userLocation = useUserLocationStore();
  const [slides, setSlides] = useState(() => HERO_IMAGES.map((slide) => ({ ...slide, local: true })));
  const [categories, setCategories] = useState(CATEGORIES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tabHidden, setTabHidden] = useState(typeof document !== 'undefined' && document.hidden);
  const touchStartX = useRef(null);
  const [form, setForm] = useState({ categorySlug: '', minPrice: '', maxPrice: '' });

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    heroSlideService.listActive()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setSlides(list);
      })
      .catch(() => {});
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

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    const locationQuery = form.location || '';
    if (locationQuery) {
      params.set('city', locationQuery);
      params.set('search', locationQuery);
    }
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
      className="relative flex min-h-[460px] w-full flex-col items-center justify-center overflow-hidden sm:min-h-[520px] md:min-h-[540px] lg:min-h-[620px]"
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
          src={s.local ? s.image : resolveAssetUrl(s.image)}
          alt={s.alt || ''}
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
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-warm-white/20 p-1.5 text-warm-white hover:bg-warm-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warm-white sm:p-2"
          >
            <ChevronLeft size={18} className="sm:hidden" />
            <ChevronLeft size={22} className="hidden sm:block" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t('hero.nextSlide', { ns: 'properties', defaultValue: 'Next slide' })}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-warm-white/20 p-1.5 text-warm-white hover:bg-warm-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warm-white sm:p-2"
          >
            <ChevronRight size={18} className="sm:hidden" />
            <ChevronRight size={22} className="hidden sm:block" />
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

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-8 text-center sm:px-5 sm:py-12 md:px-8 md:py-14">
        <h1 className="max-w-3xl text-[clamp(26px,7vw,52px)] font-bold leading-tight text-warm-white drop-shadow sm:text-5xl md:text-[clamp(2rem,5vw,3.5rem)]">{heading}</h1>
        {subtitle && <p className="lang-te mt-2 max-w-2xl text-sm text-warm-white/90 drop-shadow sm:mt-3 sm:text-base md:mt-4 md:text-lg">{subtitle}</p>}

        <form
          onSubmit={handleSearch}
          className="mt-6 flex w-full max-w-[500px] flex-col gap-2 rounded-2xl bg-warm-white/95 p-2.5 shadow-xl sm:mt-8 sm:max-w-4xl sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5 sm:p-3 md:mt-10 md:max-w-[760px] md:flex-nowrap md:p-4 lg:max-w-[900px]"
        >
          <button
            type="button"
            onClick={() => userLocation.requestLocation()}
            className="flex min-h-[42px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 md:min-h-[48px] md:px-4 md:text-base"
          >
            <Crosshair size={16} className="shrink-0 text-brand-600" />
            <span className="truncate">
              {userLocation.status === 'loading'
                ? t('location.detecting', { ns: 'common' })
                : userLocation.label || t('location.useCurrentLocation', { ns: 'common' })}
            </span>
          </button>

          <select
            value={form.categorySlug}
            onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}
            aria-label={t('hero.categoryPlaceholder')}
            className="min-h-[42px] min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 md:min-h-[48px] md:px-4 md:text-base"
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
            className="min-h-[42px] min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 md:min-h-[48px] md:px-4 md:text-base"
          />
          <input
            type="number"
            min="0"
            value={form.maxPrice}
            onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
            placeholder={t('hero.maxPricePlaceholder')}
            aria-label={t('hero.maxPricePlaceholder')}
            className="min-h-[42px] min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 md:min-h-[48px] md:px-4 md:text-base"
          />

          <button
            type="submit"
            className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 md:min-h-[48px] md:px-6 md:text-base"
          >
            <Search size={16} /> {t('buttons.search', { ns: 'common' })}
          </button>
        </form>
      </div>
    </section>
  );
}
