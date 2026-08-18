import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Clock, TrendingUp, Loader2, Navigation } from 'lucide-react';
import { CITIES } from '../../data/locations';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { loadGoogleMaps, isPlacesAvailable } from '../../utils/googleMapsLoader';

const DEBOUNCE_MS = 350;

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
    || findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1')
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

/* ── Component ───────────────────────────────────────────────────────────── */

/**
 * Shared "Select Location" panel used by the Navbar.
 * 1. Uses new AutocompleteSuggestion.fetchAutocompleteSuggestions for predictions.
 * 2. Falls back to Google Geocoder if Places API is not enabled.
 * 3. Falls back to static CITIES list if Google Maps is unavailable.
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
  const [googleMode, setGoogleMode] = useState('idle'); // 'idle' | 'places' | 'geocoder' | 'none'
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

  /* ── Load Google Maps + detect Places availability ─────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps) return;
      if (isPlacesAvailable()) {
        setGoogleMode('places');
      } else {
        console.warn('[LocationPicker] Places library unavailable, falling back to Geocoder.');
        geocoderRef.current = new maps.Geocoder();
        setGoogleMode('geocoder');
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
    const city = getCityFromComponents(components);
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

    // Geocoder results already have address_components
    if (norm._raw?.address_components) {
      handlePlaceSelection(norm._raw);
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

  const fallbackCities = useMemo(() => {
    if (!query.trim()) return CITIES;
    const term = query.trim().toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(term));
  }, [query]);

  /* ── New Places search: AutocompleteSuggestion.fetchAutocompleteSuggestions ── */
  const searchPlaces = useCallback(async (searchQuery, requestId) => {
    if (!isPlacesAvailable()) return false;
    try {
      const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchQuery,
        componentRestrictions: { country: 'in' },
        sessionToken: sessionTokenRef.current,
      });
      if (requestId !== abortRef.current) return true;
      setSearching(false);
      const raw = response?.suggestions || [];
      setSuggestions(raw.map(normaliseSuggestion));
      return true;
    } catch (err) {
      console.warn('[LocationPicker] fetchAutocompleteSuggestions failed:', err);
      if (requestId !== abortRef.current) return true;
      setSearching(false);
      setSuggestions([]);
      return true;
    }
  }, []);

  /* ── Geocoder fallback search ──────────────────────────────────────────── */
  const searchGeocoder = useCallback((searchQuery, requestId) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) return false;
    geocoder.geocode(
      { address: searchQuery, componentRestrictions: { country: 'in' } },
      (results, status) => {
        if (requestId !== abortRef.current) return;
        setSearching(false);
        if (status === 'OK' && results?.length) {
          setSuggestions(results.map((r) => {
            const place = geocoderResultToPlace(r);
            return normaliseSuggestion({ placePrediction: { ...place, placeId: place.place_id, mainText: { text: place.structured_formatting.main_text }, secondaryText: { text: place.structured_formatting.secondary_text }, text: { text: place.description } } });
          }));
        } else {
          setSuggestions([]);
        }
      },
    );
    return true;
  }, []);

  /* ── Unified search dispatcher ──────────────────────────────────────────── */
  const searchGoogle = useCallback((searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 1) {
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

    if (!searchPlaces(trimmed, requestId)) {
      if (!searchGeocoder(trimmed, requestId)) {
        setSearching(false);
      }
    }
  }, [searchPlaces, searchGeocoder]);

  /* ── Debounced search on input change ──────────────────────────────────── */
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setSuggestionsActive(false);
      setSearching(false);
      setHighlightedIndex(-1);
      return;
    }
    if (googleMode === 'none') {
      setSuggestionsActive(true);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchGoogle(value), DEBOUNCE_MS);
  }, [searchGoogle, googleMode]);

  /* ── Keyboard navigation in suggestions ─────────────────────────────────── */
  const handleInputKeyDown = useCallback((e) => {
    if (!suggestionsActive) return;
    const hasResults = googleMode !== 'none'
      ? suggestions.length > 0
      : fallbackCities.length > 0;
    if (!hasResults && !searching) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = googleMode !== 'none' ? suggestions.length : fallbackCities.length;
      setHighlightedIndex((prev) => (prev + 1) % max);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const max = googleMode !== 'none' ? suggestions.length : fallbackCities.length;
      setHighlightedIndex((prev) => (prev <= 0 ? max - 1 : prev - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      if (googleMode !== 'none' && suggestions[highlightedIndex]) {
        handleSuggestionSelect(suggestions[highlightedIndex]);
      } else if (googleMode === 'none' && fallbackCities[highlightedIndex]) {
        selectLocation(fallbackCities[highlightedIndex]);
        onClose();
      }
    }
  }, [suggestionsActive, googleMode, suggestions, fallbackCities, highlightedIndex, searching, handleSuggestionSelect, selectLocation, onClose]);

  /* ── Clear selected location ───────────────────────────────────────────── */
  const handleClear = useCallback(() => {
    clearLocation();
    useUserLocationStore.getState().clear();
    onClose();
  }, [clearLocation, onClose]);

  if (!open) return null;

  const showGoogleSuggestions = googleMode !== 'none' && suggestions.length > 0;
  const showFallbackCities = googleMode === 'none' || (googleMode !== 'none' && !searching && suggestions.length === 0 && query.trim());
  const showNoResults = googleMode !== 'none' && !searching && suggestions.length === 0 && query.trim();

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

        <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {t('location.orPickCity')}
        </p>

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
            aria-expanded={suggestionsActive && (suggestions.length > 0 || fallbackCities.length > 0 || searching)}
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

        {/* Suggestions / Cities */}
        <div className="mt-3">
          {query ? (
            <>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-gray-400">
                <TrendingUp size={12} /> {t('location.results')}
              </p>

              {/* Google suggestions (new Places API or Geocoder) */}
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

              {/* No Google results */}
              {showNoResults && (
                <p className="py-4 text-center text-sm text-gray-400">{t('empty.noResults')}</p>
              )}

              {/* Fallback to static CITIES when Google not available */}
              {showFallbackCities && googleMode === 'none' && (
                fallbackCities.length > 0 ? (
                  <ul role="listbox" aria-label={t('nav.selectLocation')} className="max-h-48 space-y-0.5 overflow-auto">
                    {fallbackCities.map((city, idx) => (
                      <li key={city}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={city === selectedLocation || idx === highlightedIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectLocation(city);
                            onClose();
                          }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                            city === selectedLocation ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700'
                          }`}
                        >
                          {city}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-400">{t('empty.noResults')}</p>
                )
              )}
            </>
          ) : (
            <>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase text-gray-400">
                <TrendingUp size={12} /> {t('location.popular')}
              </p>
              <ul role="listbox" aria-label={t('nav.selectLocation')} className="max-h-48 space-y-0.5 overflow-auto">
                {CITIES.map((city) => (
                  <li key={city}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={city === selectedLocation}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectLocation(city);
                        onClose();
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                        city === selectedLocation ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700'
                      }`}
                    >
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
