import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X } from 'lucide-react';
import { readJSON, writeJSON, STORAGE_KEYS } from '../../utils/storage';

const POPUP_DELAY_MS = 5000;

/**
 * Custom (non-native) location-permission prompt. Deliberately never calls
 * navigator.geolocation.getCurrentPosition() on its own — only in direct
 * response to "Allow while visiting" / "Allow this time", so the real
 * browser permission dialog only appears after a user gesture on our own
 * dialog, never immediately on page load.
 *
 * Deliberately has NO full-screen click-catching backdrop — a
 * document-level mousedown listener (the same pattern the Navbar's Register
 * dropdown already uses) detects outside clicks instead, so the dialog
 * never intercepts pointer events meant for the rest of the page (the Hero
 * carousel's controls, property card buttons, etc. all keep working
 * normally even while this is open).
 *
 * Persistence (STORAGE_KEYS.GEO_PERMISSION, localStorage):
 *  - 'allow-always' -> geolocation requested once now, popup never shown again.
 *  - 'never'        -> popup never shown again, geolocation never requested.
 *  - unset (Allow this time / Close / Escape / click-outside) -> nothing
 *    persisted, so the popup reappears 5s into the next visit.
 */
export default function LocationPermissionPopup() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const saved = readJSON(STORAGE_KEYS.GEO_PERMISSION, null);
    if (saved === 'allow-always' || saved === 'never') return undefined;
    const timer = setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const close = useCallback(() => {
    setEntered(false);
    setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') close();
    }
    function handleClickOutside(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) close();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, close]);

  function requestLocation() {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { timeout: 8000 }
      );
    }
  }

  function handleAllowAlways() {
    requestLocation();
    writeJSON(STORAGE_KEYS.GEO_PERMISSION, 'allow-always');
    close();
  }

  function handleAllowOnce() {
    requestLocation();
    close();
  }

  function handleNeverAllow() {
    writeJSON(STORAGE_KEYS.GEO_PERMISSION, 'never');
    close();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] flex justify-center sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:justify-end">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="geo-popup-title"
        className={`w-full max-w-sm rounded-2xl border border-gray-200/70 bg-warm-white/90 p-5 shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <MapPin size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 id="geo-popup-title" className="text-sm font-bold text-gray-900">{t('geoPopup.title')}</h2>
              <button
                type="button"
                onClick={close}
                aria-label={t('buttons.close')}
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <X size={16} />
              </button>
            </div>
            <p className="lang-te mt-1 text-xs text-gray-600">{t('geoPopup.description')}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleAllowAlways}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {t('geoPopup.allowWhileVisiting')}
          </button>
          <button
            type="button"
            onClick={handleAllowOnce}
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {t('geoPopup.allowThisTime')}
          </button>
          <button
            type="button"
            onClick={handleNeverAllow}
            className="w-full rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {t('geoPopup.neverAllow')}
          </button>
        </div>
      </div>
    </div>
  );
}
