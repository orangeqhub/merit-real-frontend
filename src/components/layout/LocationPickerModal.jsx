import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Clock, TrendingUp, Loader2, Navigation } from 'lucide-react';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { loadGoogleMaps, isPlacesAvailable } from '../../utils/googleMapsLoader';

const DEBOUNCE_MS = 350;
// Suggestions start firing automatically once the user has typed this many letters
const MIN_QUERY_LENGTH = 2;
// Set once Places autocomplete fails with a permission error so we stop
// retrying a doomed RPC on every keystroke and fall through instantly.
let placesApiBroken = false;

/* ── Address-component helpers ───────────────────────────────────────────── */

function findComponent(components, type) {
  const c = components.find((x) => {
    const types = x.types || x.type || [];
    return types.includes(type);
  });
  if (!c) return '';
  // New API: longName  |  Legacy Geocoder: long_name
  return c.longName || c.long_name || '';
}

function getCityFromComponents(components) {
  return findComponent(components, 'locality')
    || findComponent(components, 'postal_town')
    || findComponent(components, 'colloquial_area')
    || findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1')
    || findComponent(components, 'administrative_area_level_3')
    || findComponent(components, 'administrative_area_level_2')
    || findComponent(components, 'administrative_area_level_1')
    || '';
}

function getStateFromComponents(components) {
  return findComponent(components, 'administrative_area_level_1');
}

function getAreaFromComponents(components) {
  return findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1')
    || findComponent(components, 'neighborhood')
    || '';
}

function getLabelFromComponents(components) {
  const locality = findComponent(components, 'locality');
  const sublocality = findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1');
  const state = findComponent(components, 'administrative_area_level_1');
  if (sublocality && locality && sublocality !== locality) {
    return `${sublocality}, ${locality}`;
  }
  if (locality) return state ? `${locality}, ${state}` : locality;
  return '';
}

/**
 * Build a normalised place object from a Geocoder result so
 * handlePlaceSelection can consume it uniformly.
 */
function geocoderResultToPlace(result) {
  const components = result.address_components || [];
  return {
    place_id: result.place_id || null,
    description: result.formatted_address || '',
    formatted_address: result.formatted_address || '',
    address_components: components,
    geometry: result.geometry || null,
    name: result.formatted_address || '',
    structured_formatting: {
      main_text: getLabelFromComponents(components) || result.formatted_address || '',
      secondary_text: result.formatted_address || '',
    },
  };
}

/**
 * Normalise a new-API suggestion into the same internal shape
 * so rendering / selection code stays uniform.
 */
function normaliseSuggestion(suggestion) {
  const pred = suggestion.placePrediction || suggestion;
  return {
    placeId: pred.placeId || pred.place_id || null,
    description: pred.text?.text || pred.description || '',
    mainText: pred.mainText?.text || pred.structured_formatting?.main_text || '',
    secondaryText: pred.secondaryText?.text || pred.structured_formatting?.secondary_text || '',
    types: pred.types || [],
    _raw: suggestion,
  };
}

/**
 * Convert a Photon (OpenStreetMap) GeoJSON feature into the same internal
 * shape as Geocoder results so selection code stays uniform.
 */
function photonToSuggestion(feature) {
  const p = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  // Drop "(Urban)"-style qualifiers so the stored city matches property data
  const clean = (value) => (value ? String(value).replace(/\s*\([^)]*\)\s*$/, '').trim() : '');

  const comps = [];
  const push = (value, type) => {
    const v = clean(value);
    if (v) comps.push({ long_name: v, short_name: v, types: [type] });
  };
  push(p.city || p.town || p.village || p.municipality || p.county, 'locality');
  push(p.district || p.suburb || p.neighbourhood, 'sublocality');
  push(p.state, 'administrative_area_level_1');

  const mainText = clean(p.name);
  const secondaryParts = [p.city || p.county, p.state, p.country]
    .map(clean)
    .filter((part, i, arr) => part && part !== mainText && arr.indexOf(part) === i);
  const secondaryText = secondaryParts.join(', ');
  const description = [mainText, secondaryText].filter(Boolean).join(', ');

  return normaliseSuggestion({
    placePrediction: {
      placeId: p.osm_id != null ? `photon-${p.osm_type || 'n'}-${p.osm_id}` : null,
      text: { text: description },
      mainText: { text: mainText },
      secondaryText: { text: secondaryText },
      types: p.osm_value ? [p.osm_value] : [],
      formatted_address: description,
      address_components: comps,
      geometry: Number.isFinite(lat) && Number.isFinite(lng) ? { location: { lat, lng } } : null,
    },
  });
}

/* ── Component ───────────────────────────────────────────────────────────── */

/**
 * Shared "Select Location" panel used by the Navbar.
 * Search cascade (first source that returns results wins):
 * 1. Places API autocomplete (new) — skipped once it fails with a permission error.
 * 2. Google Geocoder (JS API) — good for full addresses, weak on short prefixes.
 * 3. Photon (OpenStreetMap) — excellent 2-4 letter prefix matching, no key needed.
 * No static city list — every result comes from a live search that
 * fires automatically once at least MIN_QUERY_LENGTH letters are typed.
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
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [suggestionsActive, setSuggestionsActive] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const autoRequestedRef = useRef(false);
  const debounceRef = useRef(null);
  const geocoderRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const abortRef = useRef(0);

  /* ── Load Google Maps + prepare Geocoder fallback ───────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps) return;
      if (!isPlacesAvailable()) {
        console.warn('[LocationPicker] Places library unavailable, falling back to Geocoder.');
        geocoderRef.current = new maps.Geocoder();
      }
    });
    return () => { cancelled = true; };
  }, [open]);

  // Create a fresh session token when the modal opens or after a selection
  const refreshSessionToken = useCallback(() => {
    if (isPlacesAvailable()) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  /* ── Focus input when opened ───────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSuggestions([]);
      setSuggestionsActive(false);
      setHighlightedIndex(-1);
      refreshSessionToken();
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, refreshSessionToken]);

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

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const headerLabel = selectedLocation || geoLabel;

  /* ── Handle a resolved place (from any source) ─────────────────────────── */
  const handlePlaceSelection = useCallback((result) => {
    const components = result.address_components || [];
    const city = getCityFromComponents(components)
      || (result.formatted_address || result.description || '').split(',')[0]?.trim()
      || '';
    if (!city) return;
    const state = getStateFromComponents(components);
    const area = getAreaFromComponents(components);
    const label = getLabelFromComponents(components) || result.description || city;
    const geometry = result.geometry?.location;
    const lat = geometry ? (typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat) : null;
    const lng = geometry ? (typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng) : null;

    selectLocation(city, {
      city,
      state,
      area,
      label,
      placeId: result.place_id || null,
      formattedAddress: result.formatted_address || '',
      latitude: lat,
      longitude: lng,
    });
    refreshSessionToken();
    onClose();
  }, [selectLocation, onClose, refreshSessionToken]);

  /* ── Resolve a selected suggestion → fetch full Place details ──────────── */
  const handleSuggestionSelect = useCallback(async (norm) => {
    if (!norm) return;

    // Geocoder / Nominatim results already have address_components
    // (either directly on _raw or nested under placePrediction)
    const raw = norm._raw?.address_components ? norm._raw : norm._raw?.placePrediction;
    if (raw?.address_components) {
      handlePlaceSelection(raw);
      return;
    }

    // New API: use Place.fetchFields
    const placeId = norm.placeId;
    if (placeId && isPlacesAvailable()) {
      try {
        const PlaceClass = window.google.maps.places.Place;
        const place = new PlaceClass({ placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
        });
        // Normalize to the shape handlePlaceSelection expects
        const components = (place.addressComponents || []).map((ac) => ({
          types: ac.types,
          long_name: ac.longName || '',
          short_name: ac.shortName || '',
        }));
        const loc = place.location;
        handlePlaceSelection({
          place_id: placeId,
          description: place.formattedAddress || norm.description,
          formatted_address: place.formattedAddress || norm.description,
          address_components: components,
          geometry: loc ? { location: loc } : null,
          name: place.displayName || norm.mainText,
        });
        return;
      } catch (err) {
        console.warn('[LocationPicker] Place.fetchFields failed:', err);
        // Fall through to text-based fallback
      }
    }

    // Last resort: use text only
    const city = norm.mainText || norm.description || '';
    if (city) {
      selectLocation(city, {
        city,
        state: '',
        area: '',
        label: city,
        placeId: norm.placeId || null,
        formattedAddress: norm.description || '',
        latitude: null,
        longitude: null,
      });
      refreshSessionToken();
      onClose();
    }
  }, [handlePlaceSelection, selectLocation, onClose, refreshSessionToken]);

  /* ── New Places search: AutocompleteSuggestion.fetchAutocompleteSuggestions ── */
  const searchPlaces = useCallback(async (searchQuery, requestId) => {
    if (!isPlacesAvailable() || placesApiBroken) return 'unavailable';
    try {
      const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchQuery,
        includedRegionCodes: ['in'],
        sessionToken: sessionTokenRef.current,
      });
      if (requestId !== abortRef.current) return 'stale';
      setSearching(false);
      const raw = response?.suggestions || [];
      setSuggestions(raw.map(normaliseSuggestion));
      return raw.length > 0 ? 'ok' : 'empty';
    } catch (err) {
      console.warn('[LocationPicker] fetchAutocompleteSuggestions failed:', err);
      // Permission/RPC errors mean this key can't use Places — remember and skip.
      placesApiBroken = true;
      if (requestId !== abortRef.current) return 'stale';
      return 'failed';
    }
  }, []);

  /* ── Geocoder fallback search ──────────────────────────────────────────── */
  const searchGeocoder = useCallback((searchQuery, requestId) => new Promise((resolve) => {
    if (!geocoderRef.current && window.google?.maps?.Geocoder) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
    const geocoder = geocoderRef.current;
    if (!geocoder) {
      resolve('unavailable');
      return;
    }
    geocoder.geocode(
      { address: searchQuery, componentRestrictions: { country: 'in' } },
      (results, status) => {
        if (requestId !== abortRef.current) {
          resolve('stale');
          return;
        }
        setSearching(false);
        if (status === 'OK' && results?.length) {
          setSuggestions(results.map((r) => {
            const place = geocoderResultToPlace(r);
            return normaliseSuggestion({ placePrediction: { ...place, placeId: place.place_id, mainText: { text: place.structured_formatting.main_text }, secondaryText: { text: place.structured_formatting.secondary_text }, text: { text: place.description } } });
          }));
          resolve('ok');
        } else {
          resolve('empty');
        }
      },
    );
  }), []);

  /* ── Photon (OpenStreetMap) fallback search ────────────────────────────── */
  // Used when Places autocomplete and the Google Geocoder fail or return
  // nothing. Photon is an autocomplete-oriented OSM service: it matches
  // short prefixes (2-4 letters) far better than Nominatim or the Geocoder
  // and needs no API key. Bounded to India via bbox.
  const searchPhoton = useCallback(async (searchQuery, requestId) => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=6&lang=en&bbox=68.1,6.0,97.4,35.6`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestId !== abortRef.current) return;
      setSearching(false);
      // Photon often returns both a city and its district boundary — keep first of each
      const seen = new Set();
      const unique = ((data && data.features) || [])
        .map(photonToSuggestion)
        .filter((norm) => {
          const key = norm.description.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      setSuggestions(unique);
    } catch (err) {
      console.warn('[LocationPicker] Photon search failed:', err);
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions([]);
    }
  }, []);

  /* ── Unified search dispatcher ──────────────────────────────────────────── */
  // Cascade: Places autocomplete → Google Geocoder → Photon (OSM).
  const searchGoogle = useCallback((searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestionsActive(false);
      setSearching(false);
      setHighlightedIndex(-1);
      return;
    }

    const requestId = ++abortRef.current;
    setSearching(true);
    setSuggestionsActive(true);
    setHighlightedIndex(-1);

    (async () => {
      let status = await searchPlaces(trimmed, requestId);
      if (status === 'ok' || status === 'stale') return;
      status = await searchGeocoder(trimmed, requestId);
      if (status === 'ok' || status === 'stale') return;
      await searchPhoton(trimmed, requestId);
    })();
  }, [searchPlaces, searchGeocoder, searchPhoton]);

  /* ── Debounced search on input change ──────────────────────────────────── */
  // Fires automatically once the query reaches MIN_QUERY_LENGTH letters.
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestionsActive(false);
      setSearching(false);
      setHighlightedIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(() => searchGoogle(value), DEBOUNCE_MS);
  }, [searchGoogle]);

  /* ── Keyboard navigation in suggestions ─────────────────────────────────── */
  const handleInputKeyDown = useCallback((e) => {
    if (!suggestionsActive || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[highlightedIndex]);
    }
  }, [suggestionsActive, suggestions, highlightedIndex, handleSuggestionSelect]);

  /* ── Clear selected location ───────────────────────────────────────────── */
  const handleClear = useCallback(() => {
    clearLocation();
    useUserLocationStore.getState().clear();
    onClose();
  }, [clearLocation, onClose]);

  if (!open) return null;

  const showGoogleSuggestions = suggestions.length > 0;
  const queryLength = query.trim().length;
  const showNoResults = !searching && !showGoogleSuggestions && queryLength >= MIN_QUERY_LENGTH;

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

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={t('location.searchPlaceholder')}
            aria-label={t('location.searchPlaceholder')}
            aria-autocomplete="list"
            aria-expanded={suggestionsActive && (suggestions.length > 0 || searching)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {/* Selected location */}
        {selectedLocation && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
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

        {/* Recent locations (shown when not searching) */}
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectLocation(city);
                      onClose();
                    }}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions (search results only — no static list) */}
        <div className="mt-3">
          {queryLength >= MIN_QUERY_LENGTH && (
            <>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-gray-400">
                <TrendingUp size={12} /> {t('location.results')}
              </p>

              {/* Live search suggestions (Places API → Geocoder → Nominatim) */}
              {showGoogleSuggestions && (
                <ul role="listbox" aria-label={t('nav.selectLocation')} className="max-h-48 space-y-0.5 overflow-auto">
                  {suggestions.map((norm, idx) => (
                    <li key={norm.placeId || norm.description || idx}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={idx === highlightedIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(norm);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSuggestionSelect(norm);
                          }
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                          idx === highlightedIndex ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700'
                        }`}
                      >
                        <span className="line-clamp-1">{norm.mainText || norm.description}</span>
                        {norm.secondaryText && norm.secondaryText !== norm.mainText && (
                          <span className="block text-xs text-gray-400 line-clamp-1">
                            {norm.secondaryText}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showNoResults && (
                <p className="py-4 text-center text-sm text-gray-400">{t('location.noResults', 'No locations found')}</p>
              )}
            </>
          )}

          {(queryLength === 0 || queryLength < MIN_QUERY_LENGTH) && !searching && (
            <p className="flex items-center justify-center gap-1.5 py-6 text-center text-sm text-gray-400">
              <Search size={14} /> {t('location.typeToSearch')}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
