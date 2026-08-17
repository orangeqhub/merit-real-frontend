import { useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Heart, MapPin, Search, Tag } from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
import ProfileDropdown from './ProfileDropdown';
import LocationPickerModal from './LocationPickerModal';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { toast } from '../../store/toastStore';
import { resolvePostPropertyAction } from '../../utils/postPropertyAccess';
const logoImage = '/logo.svg';

const NAV_LINKS = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/properties', labelKey: 'nav.properties' },
  { to: '/map-layout', labelKey: 'nav.mapLayout' },
  { to: '/about', labelKey: 'nav.about' },
];

export default function Navbar() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const user = useAuthStore((s) => s.user);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const geoLabel = useUserLocationStore((s) => s.label);
  const headerLocation = selectedLocation || geoLabel;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const desktopLocationRef = useRef(null);
  const mobileLocationRef = useRef(null);

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap text-sm font-medium transition-colors hover:text-brand-700 ${isActive ? 'text-brand-800' : 'text-gray-700'}`;

  function handleSell() {
    const action = resolvePostPropertyAction(user);
    if (action.messageKey) {
      (action.toastType === 'error' ? toast.error : toast.info)(t(action.messageKey));
    }
    if (action.type === 'route') navigate(action.to);
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const term = searchTerm.trim();
    setSearchOpen(false);
    setMobileOpen(false);
    navigate(term ? `/properties?search=${encodeURIComponent(term)}` : '/properties');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-warm-white/95 backdrop-blur-md">
      {/* ── Main row ── */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 md:py-3 lg:px-6">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2" style={{ minWidth: 0 }}>
          {logoError ? (
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-bold text-warm-white sm:h-10 sm:w-10 md:h-11 md:w-11">
                M
              </span>
              <span className="text-sm font-bold text-brand-800 sm:text-lg md:text-xl">
                {t('brand.name')}
              </span>
            </div>
          ) : (
            <img
              src={logoImage}
              alt={t('brand.logoAlt')}
              onError={() => setLogoError(true)}
              className="h-8 w-auto object-contain sm:h-11 md:h-12"
              style={{ maxWidth: 'clamp(130px, 28vw, 260px)' }}
            />
          )}
        </Link>

        {/* Desktop nav links */}
        <nav className="ml-6 hidden items-center gap-5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClass}>
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <button
              ref={desktopLocationRef}
              type="button"
              onClick={() => setLocationOpen((o) => !o)}
              className="flex max-w-[9rem] items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <MapPin size={16} className="shrink-0" />
              <span className="truncate">{headerLocation || t('nav.selectLocation')}</span>
            </button>
            <LocationPickerModal
              open={locationOpen}
              onClose={() => setLocationOpen(false)}
              triggerRef={desktopLocationRef}
            />
          </div>

          <button
            type="button"
            onClick={openSearch}
            aria-label={t('buttons.search')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <Search size={19} />
          </button>

          <Link
            to="/wishlist"
            aria-label={t('nav.wishlist')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-brand-50 hover:text-red-500"
          >
            <Heart size={19} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-warm-white">
                {wishlistCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={handleSell}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-600 px-4 py-1.5 text-sm font-bold text-warm-white transition-colors hover:bg-brand-700"
          >
            <Tag size={15} /> {t('nav.sell')}
          </button>

          {user ? (
            <ProfileDropdown />
          ) : (
            <Link
              to="/login"
              className="whitespace-nowrap rounded-full border border-brand-500 px-3.5 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              {t('nav.login')}
            </Link>
          )}

          <LanguageToggle className="shrink-0" />
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          className="flex shrink-0 items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
          style={{ minWidth: 42, minHeight: 42 }}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Desktop search overlay ── */}
      {searchOpen && (
        <div className="border-t border-gray-100 bg-warm-white px-4 py-3 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="mx-auto flex max-w-7xl items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('placeholders.searchProperties')}
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700">
              {t('buttons.search')}
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label={t('buttons.close')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* ── Mobile menu drawer ── */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-warm-white px-4 py-4 shadow-lg lg:hidden">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('placeholders.searchProperties')}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
            />
          </form>
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
                style={{ minHeight: 44 }}
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => { handleSell(); setMobileOpen(false); }}
              className="rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
              style={{ minHeight: 44 }}
            >
              {t('nav.sell')}
            </button>
            <div className="relative">
              <button
                ref={mobileLocationRef}
                type="button"
                onClick={() => setLocationOpen((o) => !o)}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand-700"
                style={{ minHeight: 44 }}
              >
                <MapPin size={16} className="shrink-0" />
                <span className="truncate">{headerLocation || t('nav.selectLocation')}</span>
              </button>
              <LocationPickerModal
                open={locationOpen}
                onClose={() => setLocationOpen(false)}
                triggerRef={mobileLocationRef}
              />
            </div>
            <div className="my-2 border-t border-gray-100" />
            <div className="flex items-center gap-3 px-3 py-2">
              <LanguageToggle />
              <Link
                to="/wishlist"
                aria-label={t('nav.wishlist')}
                onClick={() => setMobileOpen(false)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-brand-50 hover:text-red-500"
              >
                <Heart size={20} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-warm-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              {user && <ProfileDropdown />}
            </div>
            {!user && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="mx-3 mt-2 rounded-lg border border-brand-500 px-4 py-3 text-center text-sm font-semibold text-brand-700"
                style={{ minHeight: 44 }}
              >
                {t('nav.login')}
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
