import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Clock, TrendingUp, Loader2, Navigation } from 'lucide-react';
import { CITIES } from '../../data/locations';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';

/**
 * Shared "Select Location" panel used by the Navbar.
 * Requests browser geolocation only after the user opens this panel
 * (explicit "Select Location" click) or taps "Use my current location" / "Try again".
 */
export default function LocationPickerModal({ open, onClose, triggerRef }) {
  const { t } = useTranslation('common');
  const { selectedLocation, recentLocations, selectLocation, clearLocation } = useLocationStore();
  const geoStatus = useUserLocationStore((s) => s.status);
  const geoPlace = useUserLocationStore((s) => s.place);
  const geoLabel = useUserLocationStore((s) => s.label);
  const geoError = useUserLocationStore((s) => s.error);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const autoRequestedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) {
      autoRequestedRef.current = false;
      return undefined;
    }
    if (!autoRequestedRef.current && geoStatus === 'idle') {
      autoRequestedRef.current = true;
      requestLocation();
    }
    return undefined;
  }, [open, geoStatus, requestLocation]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      const target = e.target;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose, triggerRef]);

  const filteredCities = useMemo(() => {
    if (!query.trim()) return CITIES;
    const term = query.trim().toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(term));
  }, [query]);

  const headerLabel = selectedLocation || geoLabel;

  if (!open) return null;

  function handleSelect(city) {
    selectLocation(city);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.selectLocation')}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] w-full overflow-auto rounded-t-2xl border border-gray-100 bg-warm-white p-4 pb-[max(1rem,calc(1rem+env(safe-area-inset-bottom)))] shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[28rem] sm:w-80 sm:rounded-lg sm:p-3 sm:pb-3"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800 sm:text-base">{t('nav.selectLocation')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('buttons.close')}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <MapPin size={14} /> {geoStatus === 'granted' ? t('location.yourLocation') : t('nav.selectLocation')}
          </p>

          {geoStatus === 'loading' && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin text-brand-600" />
              {t('location.detecting')}
            </div>
          )}

          {geoStatus === 'granted' && (geoPlace || headerLabel) && (
            <div className="mt-2 space-y-0.5">
              <p className="text-base font-semibold text-brand-900">{geoPlace?.city || headerLabel}</p>
              {geoPlace?.state && <p className="text-sm text-gray-600">{geoPlace.state}</p>}
              <p className="mt-1 text-xs text-green-700">{t('location.showingNearby')}</p>
            </div>
          )}

          {(geoStatus === 'denied' || geoStatus === 'unavailable') && (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-amber-800">
                {geoError === 'unsupported'
                  ? t('location.browserUnsupported')
                  : geoError === 'timeout'
                    ? t('location.unavailable')
                    : t('location.permissionDenied')}
              </p>
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
              >
                <Navigation size={14} />
                {t('location.tryAgain')}
              </button>
            </div>
          )}

          {geoStatus !== 'loading' && (
            <button
              type="button"
              onClick={requestLocation}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
            >
              <Navigation size={14} />
              {t('location.useCurrentLocation')}
            </button>
          )}
        </div>

        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {t('location.orPickCity')}
        </p>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('location.searchPlaceholder')}
            aria-label={t('location.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        {selectedLocation && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-brand-800">
              <MapPin size={14} /> {selectedLocation}
            </span>
            <button
              type="button"
              onClick={() => {
                clearLocation();
                useUserLocationStore.getState().clear();
                onClose();
              }}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              {t('location.clear')}
            </button>
          </div>
        )}

        {!query && recentLocations.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-gray-400">
              <Clock size={12} /> {t('location.recent')}
            </p>
            <ul className="flex flex-wrap gap-2">
              {recentLocations.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    onClick={() => handleSelect(city)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-gray-400">
            <TrendingUp size={12} /> {query ? t('location.results') : t('location.popular')}
          </p>
          {filteredCities.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">{t('empty.noResults')}</p>
          ) : (
            <ul role="listbox" aria-label={t('nav.selectLocation')} className="max-h-48 space-y-0.5 overflow-auto">
              {filteredCities.map((city) => (
                <li key={city}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={city === selectedLocation}
                    onClick={() => handleSelect(city)}
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                      city === selectedLocation ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700'
                    }`}
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
