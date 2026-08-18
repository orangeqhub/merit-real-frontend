import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search, X, Clock, TrendingUp, Loader2, Navigation } from 'lucide-react';
import { CITIES } from '../../data/locations';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';

const DEBOUNCE_MS = 350;

function getCityFromComponents(components) {
  const find = (type) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? c.long_name : '';
  };
  return find('locality') || find('sublocality') || find('sublocality_level_1')
    || find('administrative_area_level_2') || find('administrative_area_level_1') || '';
}

function getStateFromComponents(components) {
  const c = components.find((x) => x.types.includes('administrative_area_level_1'));
  return c ? c.long_name : '';
}

function getAreaFromComponents(components) {
  const find = (type) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? c.long_name : '';
  };
  return find('sublocality') || find('sublocality_level_1') || find('neighborhood') || '';
}

function getLabelFromComponents(components) {
  const find = (type) => {
    const c = components.find((x) => x.types.includes(type));
    return c ? c.long_name : '';
  };
  const locality = find('locality');
  const sublocality = find('sublocality') || find('sublocality_level_1');
  const state = find('administrative_area_level_1');
  if (sublocality && locality && sublocality !== locality) {
    return `${sublocality}, ${locality}`;
  }
  if (locality) return state ? `${locality}, ${state}` : locality;
  return '';
}

/**
 * Build a normalised place object from a Geocoder result
 * (same shape as a Places prediction result so handlePlaceSelection works).
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
 * Shared "Select Location" panel used by the Navbar.
 * 1. Tries Google Places AutocompleteService for real-time predictions.
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
  const predictionsServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const abortRef = useRef(0);

  // Load Google Maps on mount — try Places, fall back to Geocoder
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !maps) return;
      // Try creating AutocompleteService — this requires Places API
      try {
        const svc = new maps.places.AutocompleteService();
        // Test with a tiny request to verify the API is actually authorized
        svc.getQueryPredictions({ input: 'test', componentRestrictions: { country: 'in' } }, (results, status) => {
          if (cancelled) return;
          if (status === maps.places.PlacesServiceStatus.OK || status === 'ZERO_RESULTS') {
            // Places API is working
            predictionsServiceRef.current = svc;
            placesServiceRef.current = new maps.places.PlacesService(document.createElement('div'));
            setGoogleMode('places');
          } else {
            // Places API is blocked / not enabled — fall back to Geocoder
            console.warn('[LocationPicker] Places API unavailable (' + status + '), falling back to Geocoder.');
            geocoderRef.current = new maps.Geocoder();
            setGoogleMode('geocoder');
          }
        });
      } catch {
        // AutocompleteService constructor itself threw — fall back to Geocoder
        console.warn('[LocationPicker] Places API not available, falling back to Geocoder.');
        geocoderRef.current = new maps.Geocoder();
        if (!cancelled) setGoogleMode('geocoder');
      }
    });
    return () => { cancelled = true; };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSuggestions([]);
      setSuggestionsActive(false);
      setHighlightedIndex(-1);
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Auto-request browser geolocation once per session
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

  // Escape key
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Click outside
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
    onClose();
  }, [selectLocation, onClose]);

  const handleSuggestionSelect = useCallback((suggestion) => {
    if (!suggestion) return;
    // Already-resolved place (geocoder result with address_components)
    if (suggestion.address_components) {
      handlePlaceSelection(suggestion);
      return;
    }
    // Places prediction — resolve via getDetails
    const svc = placesServiceRef.current;
    if (suggestion.place_id && svc) {
      svc.getDetails({ placeId: suggestion.place_id, fields: ['address_components', 'geometry', 'formatted_address', 'name'] }, (details, status) => {
        if (status !== window.google?.maps?.places?.PlacesServiceStatus.OK || !details) {
          // Fallback: construct minimal place from prediction text
          const city = suggestion.structured_formatting?.main_text || suggestion.description || '';
          if (city) {
            selectLocation(city, {
              city,
              state: '',
              area: '',
              label: city,
              placeId: suggestion.place_id || null,
              formattedAddress: suggestion.description || '',
              latitude: null,
              longitude: null,
            });
            onClose();
          }
          return;
        }
        handlePlaceSelection({ ...details, place_id: suggestion.place_id });
      });
      return;
    }
    // Last resort: use description text
    const city = suggestion.structured_formatting?.main_text || suggestion.description || '';
    if (city) {
      selectLocation(city, {
        city,
        state: '',
        area: '',
        label: city,
        placeId: suggestion.place_id || null,
        formattedAddress: suggestion.description || '',
        latitude: null,
        longitude: null,
      });
      onClose();
    }
  }, [handlePlaceSelection, selectLocation, onClose]);

  const fallbackCities = useMemo(() => {
    if (!query.trim()) return CITIES;
    const term = query.trim().toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(term));
  }, [query]);

  // --- Places Autocomplete search ---
  const searchPlaces = useCallback((searchQuery, requestId) => {
    const service = predictionsServiceRef.current;
    if (!service) return false;
    service.getQueryPredictions(
      { input: searchQuery, componentRestrictions: { country: 'in' }, types: ['geocode', 'establishment'] },
      (results, status) => {
        if (requestId !== abortRef.current) return;
        setSearching(false);
        if (status === window.google?.maps?.places?.PlacesServiceStatus.OK && results) {
          setSuggestions(results);
        } else {
          setSuggestions([]);
        }
      },
    );
    return true;
  }, []);

  // --- Geocoder fallback search ---
  const searchGeocoder = useCallback((searchQuery, requestId) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) return false;
    geocoder.geocode(
      { address: searchQuery, componentRestrictions: { country: 'in' } },
      (results, status) => {
        if (requestId !== abortRef.current) return;
        setSearching(false);
        if (status === 'OK' && results?.length) {
          setSuggestions(results.map(geocoderResultToPlace));
        } else {
          setSuggestions([]);
        }
      },
    );
    return true;
  }, []);

  // Unified search dispatcher
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

    // Try Places first, then Geocoder
    if (!searchPlaces(trimmed, requestId)) {
      if (!searchGeocoder(trimmed, requestId)) {
        setSearching(false);
      }
    }
  }, [searchPlaces, searchGeocoder]);

  // Debounced search on input change
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
      // No Google at all — just filter static CITIES
      setSuggestionsActive(true);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchGoogle(value), DEBOUNCE_MS);
  }, [searchGoogle, googleMode]);

  // Keyboard navigation in suggestions
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

  // Clear selected location
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

              {/* Google suggestions (Places or Geocoder) */}
              {showGoogleSuggestions && (
                <ul role="listbox" aria-label={t('nav.selectLocation')} className="max-h-48 space-y-0.5 overflow-auto">
                  {suggestions.map((prediction, idx) => (
                    <li key={prediction.place_id || prediction.description || idx}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={idx === highlightedIndex}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(prediction);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSuggestionSelect(prediction);
                          }
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                          idx === highlightedIndex ? 'bg-brand-50 font-semibold text-brand-800' : 'text-gray-700'
                        }`}
                      >
                        <span className="line-clamp-1">{prediction.structured_formatting?.main_text || prediction.description}</span>
                        {prediction.structured_formatting?.secondary_text && prediction.structured_formatting.secondary_text !== prediction.structured_formatting?.main_text && (
                          <span className="block text-xs text-gray-400 line-clamp-1">
                            {prediction.structured_formatting.secondary_text}
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
