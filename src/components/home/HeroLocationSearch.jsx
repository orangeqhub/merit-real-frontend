import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crosshair, MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMaps, isPlacesAvailable } from '../../utils/googleMapsLoader';
import {
  buildStructuredLocation,
  geocoderResultToPlace,
  normalisePlaceSuggestion,
} from '../../utils/googlePlaceAddress';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';

const DEBOUNCE_MS = 350;
const GEOCODER_TIMEOUT_MS = 4000;

/** Free, keyless, worldwide fallback search — used only when Google Maps
 * itself failed to load (no key / network / quota), so arbitrary locations
 * are still searchable rather than falling back to a hardcoded city list. */
async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Nominatim search failed');
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((item) => {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    const country = addr.country || '';
    const label = [city || item.name, state, country].filter(Boolean).join(', ') || item.display_name;
    return {
      placeId: null,
      description: item.display_name,
      mainText: label,
      secondaryText: item.display_name,
      _nominatim: { lat: Number(item.lat), lng: Number(item.lon), city, state, country, label },
    };
  });
}

/**
 * Homepage hero search bar's location field: real autocomplete (Google
 * Places, falling back to Geocoder, falling back to Nominatim if Google
 * Maps is unavailable), plus a "detect my location" action. Selecting a
 * suggestion stores structured { label, latitude, longitude, city, state,
 * country } and mirrors it into the app-wide location store so the rest of
 * the site (nearby sorting, header location) stays consistent.
 */
export default function HeroLocationSearch({ value, onChange }) {
  const { t } = useTranslation(['properties', 'common']);
  const requestLocation = useUserLocationStore((s) => s.requestLocation);
  const geoStatus = useUserLocationStore((s) => s.status);
  const geoLabel = useUserLocationStore((s) => s.label);
  const geoPlace = useUserLocationStore((s) => s.place);
  const geoCoords = useUserLocationStore((s) => s.coords);

  const [query, setQuery] = useState(value?.label || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(0);
  const sessionTokenRef = useRef(null);
  const geocoderRef = useRef(null);
  const awaitingDetectRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps) return;
      setGoogleReady(true);
      if (!geocoderRef.current) geocoderRef.current = new maps.Geocoder();
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (googleReady && isPlacesAvailable()) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [googleReady]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reflect a freshly detected browser location into the field, only when
  // the user actually clicked "Detect my location" (not on unrelated re-renders).
  useEffect(() => {
    if (!awaitingDetectRef.current) return;
    if (geoStatus === 'granted' && (geoLabel || geoPlace?.label)) {
      awaitingDetectRef.current = false;
      const label = geoPlace?.label || geoLabel;
      const next = {
        query: label,
        label,
        latitude: geoCoords?.lat ?? null,
        longitude: geoCoords?.lng ?? null,
        city: geoPlace?.city || null,
        state: geoPlace?.state || null,
        country: null,
      };
      setQuery(label);
      setShowDropdown(false);
      onChange?.(next);
      if (next.city) useLocationStore.getState().selectLocation(next.city, next);
    } else if (geoStatus === 'denied' || geoStatus === 'unavailable') {
      awaitingDetectRef.current = false;
      setError(
        geoStatus === 'denied'
          ? t('location.permissionDenied', { ns: 'common' })
          : t('location.unavailable', { ns: 'common' })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, geoLabel, geoPlace, geoCoords]);

  const searchViaNominatim = useCallback(async (text, requestId) => {
    try {
      const results = await searchNominatim(text);
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions(results);
      setShowDropdown(true);
    } catch {
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions([]);
      setShowDropdown(true);
      setError(t('hero.locationError', { ns: 'properties' }));
    }
  }, [t]);

  const searchGeocoderOrNominatim = useCallback((text, requestId) => {
    if (geocoderRef.current) {
      // A restricted/misconfigured key can make the geocode request fail at
      // the network level without ever invoking the callback, so race it
      // against a timeout rather than waiting on it indefinitely.
      let settled = false;
      const timer = setTimeout(() => {
        if (settled || requestId !== abortRef.current) return;
        settled = true;
        searchViaNominatim(text, requestId);
      }, GEOCODER_TIMEOUT_MS);

      geocoderRef.current.geocode({ address: text }, (results, status) => {
        if (settled || requestId !== abortRef.current) return;
        settled = true;
        clearTimeout(timer);
        if (status === 'OK' && results?.length) {
          setSearching(false);
          setSuggestions(results.map((r) => normalisePlaceSuggestion({
            placePrediction: geocoderResultToPlace(r),
          })));
          setShowDropdown(true);
          return;
        }
        // Geocoder itself is unavailable/erroring (e.g. billing/quota on the
        // shared key) rather than genuinely finding nothing — fall back to
        // the free worldwide search instead of giving up.
        searchViaNominatim(text, requestId);
      });
      return;
    }
    searchViaNominatim(text, requestId);
  }, [searchViaNominatim]);

  const searchGooglePlaces = useCallback(async (text, requestId) => {
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), GEOCODER_TIMEOUT_MS));
      const response = await Promise.race([
        window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: sessionTokenRef.current,
        }),
        timeout,
      ]);
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions((response?.suggestions || []).map(normalisePlaceSuggestion));
      setShowDropdown(true);
    } catch {
      if (requestId !== abortRef.current) return;
      searchGeocoderOrNominatim(text, requestId);
    }
  }, [searchGeocoderOrNominatim]);

  const runSearch = useCallback((text) => {
    const requestId = ++abortRef.current;
    setSearching(true);
    setError('');
    setShowDropdown(true);
    if (googleReady && isPlacesAvailable()) {
      searchGooglePlaces(text, requestId);
    } else {
      searchGeocoderOrNominatim(text, requestId);
    }
  }, [googleReady, searchGooglePlaces, searchGeocoderOrNominatim]);

  function handleInputChange(e) {
    const text = e.target.value;
    setQuery(text);
    setError('');
    onChange?.({ query: text, label: text, latitude: null, longitude: null, city: null, state: null, country: null });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      abortRef.current += 1;
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
  }

  async function handleSelect(suggestion) {
    setShowDropdown(false);
    setSuggestions([]);

    // Nominatim result — already has coordinates + parsed address.
    if (suggestion._nominatim) {
      const n = suggestion._nominatim;
      const next = {
        query: n.label,
        label: n.label,
        latitude: n.lat,
        longitude: n.lng,
        city: n.city || null,
        state: n.state || null,
        country: n.country || null,
      };
      setQuery(next.label);
      onChange?.(next);
      if (next.city) useLocationStore.getState().selectLocation(next.city, next);
      return;
    }

    setQuery(suggestion.mainText || suggestion.description || '');

    if (suggestion.placeId && isPlacesAvailable()) {
      try {
        const PlaceClass = window.google.maps.places.Place;
        const place = new PlaceClass({ placeId: suggestion.placeId });
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
        const components = (place.addressComponents || []).map((ac) => ({
          types: ac.types,
          long_name: ac.longName || '',
          short_name: ac.shortName || '',
        }));
        const loc = place.location;
        const lat = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null;
        const lng = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null;
        const next = buildStructuredLocation({
          components,
          lat,
          lng,
          label: place.displayName,
          description: place.formattedAddress || suggestion.description,
        });
        setQuery(next.label);
        onChange?.(next);
        if (next.city) useLocationStore.getState().selectLocation(next.city, next);
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        return;
      } catch {
        // fall through to raw-text fallback below
      }
    }

    // Geocoder-sourced suggestion already carries address_components on _raw.
    const raw = suggestion._raw?.placePrediction || suggestion._raw;
    if (raw?.address_components) {
      const geometry = raw.geometry?.location;
      const lat = geometry ? (typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat) : null;
      const lng = geometry ? (typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng) : null;
      const next = buildStructuredLocation({
        components: raw.address_components,
        lat,
        lng,
        label: suggestion.mainText,
        description: raw.formatted_address || suggestion.description,
      });
      setQuery(next.label);
      onChange?.(next);
      if (next.city) useLocationStore.getState().selectLocation(next.city, next);
      return;
    }

    // Last resort: text only, no coordinates.
    const label = suggestion.mainText || suggestion.description || query;
    onChange?.({ query: label, label, latitude: null, longitude: null, city: null, state: null, country: null });
  }

  function handleDetectLocation() {
    setError('');
    awaitingDetectRef.current = true;
    requestLocation();
  }

  const showLoading = searching;
  const showNoResults = !searching && showDropdown && query.trim().length >= 2 && suggestions.length === 0 && !error;

  return (
    <div ref={wrapRef} className="relative min-h-[42px] min-w-0 flex-[2] md:min-h-[48px]">
      <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" />
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={t('hero.locationPlaceholder', { ns: 'properties' })}
        aria-label={t('hero.locationPlaceholder', { ns: 'properties' })}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        className="min-h-[42px] w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-9 text-sm text-gray-700 md:min-h-[48px] md:text-base"
      />
      <button
        type="button"
        onClick={handleDetectLocation}
        aria-label={t('hero.detectLocation', { ns: 'properties' })}
        title={t('hero.detectLocation', { ns: 'properties' })}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-brand-600 hover:bg-brand-50"
      >
        {geoStatus === 'loading' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Crosshair size={16} />
        )}
      </button>

      {showDropdown && (
        <ul
          role="listbox"
          aria-label={t('hero.locationPlaceholder', { ns: 'properties' })}
          className="absolute z-20 mt-1 max-h-56 w-full min-w-[260px] overflow-auto rounded-lg border border-gray-200 bg-white text-left shadow-lg"
        >
          {showLoading && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> {t('hero.locationSearching', { ns: 'properties' })}
            </li>
          )}
          {!showLoading && suggestions.map((s, idx) => (
            <li key={`${s.placeId || s.description || 'suggestion'}-${idx}`}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(s);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="line-clamp-1 text-gray-800">{s.mainText || s.description}</span>
                {s.secondaryText && s.secondaryText !== s.mainText && (
                  <span className="block text-xs text-gray-400 line-clamp-1">{s.secondaryText}</span>
                )}
              </button>
            </li>
          ))}
          {showNoResults && (
            <li className="px-3 py-3 text-center text-sm text-gray-400">
              {t('hero.locationNoResults', { ns: 'properties' })}
            </li>
          )}
        </ul>
      )}

      {error && (
        <p className="absolute left-0 top-full mt-1 text-xs text-amber-700">{error}</p>
      )}
    </div>
  );
}
