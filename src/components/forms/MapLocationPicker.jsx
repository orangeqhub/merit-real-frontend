import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Search, Crosshair } from 'lucide-react';
import { loadGoogleMaps, isGoogleMapsAvailable, isPlacesAvailable } from '../../utils/googleMapsLoader';

const DEFAULT_CENTER = { lat: 16.3067, lng: 80.4365 }; // Guntur / AP area
const DEBOUNCE_MS = 300;

function parseLatLng(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function normaliseSuggestion(suggestion) {
  const pred = suggestion.placePrediction || suggestion;
  return {
    placeId: pred.placeId || null,
    description: pred.text?.text || '',
    mainText: pred.mainText?.text || pred.text?.text || '',
    secondaryText: pred.secondaryText?.text || '',
    types: pred.types || [],
    _raw: suggestion,
  };
}

/**
 * Property location picker using Google Maps + Places Autocomplete.
 * Falls back to Nominatim if Google Maps fails to load.
 */
export default function MapLocationPicker({ value = '', onChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const abortRef = useRef(0);

  const [query, setQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [coords, setCoords] = useState(() => {
    const parsed = parseLatLng(value);
    return parsed ? { lat: parsed[0], lng: parsed[1] } : DEFAULT_CENTER;
  });
  const [error, setError] = useState('');
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled) return;
      setMapsLoaded(!!maps);
    });
    return () => { cancelled = true; };
  }, []);

  // Create session token when maps load
  useEffect(() => {
    if (mapsLoaded && isPlacesAvailable()) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [mapsLoaded]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)
        && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !mapsLoaded || !isGoogleMapsAvailable() || mapInstance.current) return undefined;

    const position = new window.google.maps.LatLng(coords.lat, coords.lng);
    const map = new window.google.maps.Map(mapRef.current, {
      center: position,
      zoom: 14,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const marker = new window.google.maps.Marker({
      position,
      map,
      draggable: true,
      title: 'Property location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#b45309',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });

    mapInstance.current = map;
    markerInstance.current = marker;

    map.addListener('click', (e) => {
      const pos = e.latLng;
      marker.setPosition(pos);
      setCoords({ lat: pos.lat(), lng: pos.lng() });
      reverseGeocodeGoogle(pos.lat(), pos.lng());
    });

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      setCoords({ lat: pos.lat(), lng: pos.lng() });
      reverseGeocodeGoogle(pos.lat(), pos.lng());
    });

    reverseGeocodeGoogle(coords.lat, coords.lng);

    return () => {
      mapInstance.current = null;
      markerInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded]);

  // Sync external value changes
  useEffect(() => {
    const parsed = parseLatLng(value);
    if (!parsed || !mapInstance.current || !markerInstance.current) return;
    const newCoords = { lat: parsed[0], lng: parsed[1] };
    if (Math.abs(newCoords.lat - coords.lat) < 0.00001 && Math.abs(newCoords.lng - coords.lng) < 0.00001) return;
    setCoords(newCoords);
    const pos = new window.google.maps.LatLng(newCoords.lat, newCoords.lng);
    markerInstance.current.setPosition(pos);
    mapInstance.current.setCenter(pos);
  }, [value]);

  async function reverseGeocodeGoogle(lat, lng) {
    if (isGoogleMapsAvailable()) {
      const geocoder = new window.google.maps.Geocoder();
      try {
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) resolve(results[0]);
            else reject(new Error(status));
          });
        });
        setSelectedAddress(result.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setQuery(result.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setError('');
      } catch {
        const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setSelectedAddress(fallback);
        setQuery(fallback);
      }
      return;
    }
    // Nominatim fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      const addr = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(addr);
      setQuery(addr);
    } catch {
      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(fallback);
      setQuery(fallback);
    }
  }

  /* ── New Places autocomplete search ─────────────────────────────── */
  const searchPlacesAsync = useCallback(async (searchQuery, requestId) => {
    if (!isPlacesAvailable()) return false;
    try {
      const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchQuery,
        componentRestrictions: { country: 'in' },
        sessionToken: sessionTokenRef.current,
      });
      if (requestId !== abortRef.current) return true;
      setSearching(false);
      setSuggestions((response?.suggestions || []).map(normaliseSuggestion));
      setShowDropdown(true);
      return true;
    } catch (err) {
      console.warn('[MapLocationPicker] fetchAutocompleteSuggestions failed:', err);
      if (requestId !== abortRef.current) return true;
      setSearching(false);
      setSuggestions([]);
      return true;
    }
  }, []);

  /* ── Handle input change — debounced search ──────────────────────── */
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || !isPlacesAvailable()) {
      setSuggestions([]);
      setShowDropdown(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const requestId = ++abortRef.current;
    debounceRef.current = setTimeout(() => searchPlacesAsync(value.trim(), requestId), DEBOUNCE_MS);
  }, [searchPlacesAsync]);

  /* ── Handle suggestion selection ─────────────────────────────────── */
  const handleSuggestionSelect = useCallback(async (norm) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(norm.mainText || norm.description || '');

    if (norm.placeId && isPlacesAvailable()) {
      try {
        const PlaceClass = window.google.maps.places.Place;
        const place = new PlaceClass({ placeId: norm.placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        const loc = place.location;
        if (loc) {
          const newCoords = { lat: loc.lat ?? loc.lat(), lng: loc.lng ?? loc.lng() };
          setCoords(newCoords);
          setSelectedAddress(place.formattedAddress || norm.description || norm.mainText);
          setQuery(place.displayName || norm.mainText || '');
          if (markerInstance.current) markerInstance.current.setPosition(new window.google.maps.LatLng(newCoords.lat, newCoords.lng));
          if (mapInstance.current) mapInstance.current.setCenter(new window.google.maps.LatLng(newCoords.lat, newCoords.lng));
        }
        // Rotate session token
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        return;
      } catch (err) {
        console.warn('[MapLocationPicker] Place.fetchFields failed:', err);
      }
    }
    // Fallback: just use the text
    setSelectedAddress(norm.description || norm.mainText);
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  }, []);

  /* ── Manual search via Geocoder ─────────────────────────────────── */
  function searchAddress() {
    const q = inputRef.current?.value?.trim() || query.trim() || '';
    if (!q) return;
    setError('');
    setShowDropdown(false);

    if (isGoogleMapsAvailable()) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: q, componentRestrictions: { country: 'in' } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          const newCoords = { lat: loc.lat(), lng: loc.lng() };
          setCoords(newCoords);
          setSelectedAddress(results[0].formatted_address || q);
          setQuery(results[0].formatted_address || q);
          if (markerInstance.current) markerInstance.current.setPosition(loc);
          if (mapInstance.current) mapInstance.current.setCenter(loc);
        } else {
          setError('Address not found. Try a different search.');
        }
      });
      return;
    }

    // Nominatim fallback
    fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { Accept: 'application/json' } }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data?.length) {
          setError('Address not found. Try a different search.');
          return;
        }
        const lat = Number(data[0].lat);
        const lng = Number(data[0].lon);
        const newCoords = { lat, lng };
        setCoords(newCoords);
        setSelectedAddress(data[0].display_name || q);
        setQuery(data[0].display_name || q);
        if (markerInstance.current) markerInstance.current.setPosition(newCoords);
        if (mapInstance.current) mapInstance.current.setCenter(newCoords);
      })
      .catch(() => {
        setError('Unable to search address right now.');
      });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        const gPos = new window.google.maps.LatLng(newCoords.lat, newCoords.lng);
        if (markerInstance.current) markerInstance.current.setPosition(gPos);
        if (mapInstance.current) mapInstance.current.setCenter(gPos);
        reverseGeocodeGoogle(newCoords.lat, newCoords.lng);
      },
      () => setError('Unable to fetch current location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function setSelectedLocation() {
    const mapValue = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    onChange?.({
      mapLocation: mapValue,
      address: selectedAddress || mapValue,
      latitude: coords.lat,
      longitude: coords.lng,
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <MapPin size={16} className="text-brand-700" />
        Set map location
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setShowDropdown(false);
                searchAddress();
              }
              if (e.key === 'Escape') {
                setShowDropdown(false);
              }
            }}
            placeholder={mapsLoaded ? 'Search address or place (autocomplete)' : 'Search address or place'}
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
            </div>
          )}
          {/* Autocomplete dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul
              ref={dropdownRef}
              role="listbox"
              className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {suggestions.map((norm, idx) => (
                <li key={norm.placeId || idx}>
                  <button
                    type="button"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionSelect(norm);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                  >
                    <span className="line-clamp-1 text-gray-800">{norm.mainText || norm.description}</span>
                    {norm.secondaryText && norm.secondaryText !== norm.mainText && (
                      <span className="block text-xs text-gray-400 line-clamp-1">{norm.secondaryText}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={searchAddress}
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white"
        >
          <Search size={14} />
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          title="Use current location"
        >
          <Crosshair size={14} />
        </button>
      </div>

      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-lg border border-gray-200" />

      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
        <p><span className="font-medium text-gray-500">Pin:</span> {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
        <p className="mt-1"><span className="font-medium text-gray-500">Address:</span> {selectedAddress || '—'}</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={setSelectedLocation}
        className="w-full rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Set selected address
      </button>
    </div>
  );
}
