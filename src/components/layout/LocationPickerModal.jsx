import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Loader2, Navigation } from 'lucide-react';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';

/* ── Component ───────────────────────────────────────────────────────────── */

/**
 * "Select Location" panel used by the Navbar.
 * Detects the browser's current location only — city search was removed
 * (searching for a location by name is handled elsewhere, e.g. the
 * homepage hero search).
 */
export default function LocationPickerModal({ open, onClose, triggerRef }) {
  const { t } = useTranslation('common');
  const { selectedLocation, clearLocation } = useLocationStore();
  const geoStatus = useUserLocationStore((s) => s.status);
  const geoPlace = useUserLocationStore((s) => s.place);
  const geoLabel = useUserLocationStore((s) => s.label);
  const geoError = useUserLocationStore((s) => s.error);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);

  const panelRef = useRef(null);
  const autoRequestedRef = useRef(false);

  /* ── Auto-request browser geolocation once per session ─────────────────── */
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

  /* ── Escape key ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  /* ── Click outside ─────────────────────────────────────────────────────── */
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

  const headerLabel = selectedLocation || geoLabel;

  /* ── Clear selected location ───────────────────────────────────────────── */
  const handleClear = () => {
    clearLocation();
    useUserLocationStore.getState().clear();
    onClose();
  };

  if (!open) return null;

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
        {/* Header */}
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

        {/* Current detected location card */}
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

        {/* Selected location */}
        {selectedLocation && (
          <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-brand-800">
              <MapPin size={14} /> {selectedLocation}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              {t('location.clear')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
