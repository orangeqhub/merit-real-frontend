import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { STATES, DISTRICTS, CITIES } from '../../../data/locations';
import MapLocationPicker from '../MapLocationPicker';
import { loadGoogleMaps, isPlacesAvailable } from '../../../utils/googleMapsLoader';

const DEBOUNCE_MS = 300;

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

function findComp(components, type) {
  const c = components.find((x) => x.types?.includes(type));
  if (!c) return '';
  return c.longName || c.long_name || '';
}

export default function Step2Location({ data, onChange, errors }) {
  const { t } = useTranslation('forms');
  const districtOptions = data.state ? DISTRICTS[data.state] || [] : Object.values(DISTRICTS).flat();

  const [query, setQuery] = useState(data.address || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  const addressRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const abortRef = useRef(0);

  // Load Google Maps + create session token
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled) return;
      if (isPlacesAvailable()) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Sync external data.address changes to query state
  useEffect(() => {
    if (data.address !== undefined && data.address !== query) {
      setQuery(data.address || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.address]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)
        && addressRef.current && !addressRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Autocomplete search ────────────────────────────────────────── */
  const searchPlacesAsync = useCallback(async (searchQuery, requestId) => {
    if (!isPlacesAvailable()) return;
    try {
      const response = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: searchQuery,
        componentRestrictions: { country: 'in' },
        sessionToken: sessionTokenRef.current,
      });
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions((response?.suggestions || []).map(normaliseSuggestion));
      setShowDropdown(true);
    } catch (err) {
      console.warn('[Step2Location] fetchAutocompleteSuggestions failed:', err);
      if (requestId !== abortRef.current) return;
      setSearching(false);
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);
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

  /* ── Suggestion selection — fetch full place details ─────────────── */
  const handleSuggestionSelect = useCallback(async (norm) => {
    setShowDropdown(false);
    setSuggestions([]);
    setQuery(norm.mainText || norm.description || '');

    if (norm.placeId && isPlacesAvailable()) {
      try {
        const PlaceClass = window.google.maps.places.Place;
        const place = new PlaceClass({ placeId: norm.placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
        });
        const patch = {};
        if (place.formattedAddress) {
          patch.address = place.formattedAddress;
          setQuery(place.formattedAddress);
        }
        const loc = place.location;
        if (loc) {
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
          patch.latitude = lat;
          patch.longitude = lng;
          patch.mapLocation = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        const comps = (place.addressComponents || []).map((ac) => ({
          types: ac.types,
          long_name: ac.longName || '',
          short_name: ac.shortName || '',
        }));
        const pincode = findComp(comps, 'postal_code');
        if (pincode) patch.pincode = pincode;
        const city = findComp(comps, 'locality') || findComp(comps, 'sublocality') || findComp(comps, 'administrative_area_level_2');
        if (city) patch.cityVillage = city;
        const district = findComp(comps, 'administrative_area_level_2');
        if (district) patch.district = district;
        const state = findComp(comps, 'administrative_area_level_1');
        if (state) patch.state = state;
        const mandal = findComp(comps, 'sublocality_level_1') || findComp(comps, 'sublocality');
        if (mandal) patch.mandal = mandal;
        if (Object.keys(patch).length) onChange(patch);

        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        return;
      } catch (err) {
        console.warn('[Step2Location] Place.fetchFields failed:', err);
      }
    }
    // Fallback: just use the text
    onChange({ address: norm.description || norm.mainText || '' });
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  }, [onChange]);

  /* ── Manual blur sync ───────────────────────────────────────────── */
  const handleBlur = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    onChange({ address: val });
  }, [onChange]);

  function handleMapPick(pick) {
    const patch = {};
    if (pick.mapLocation) patch.mapLocation = pick.mapLocation;
    if (pick.address) {
      patch.address = pick.address;
      setQuery(pick.address);
    }
    if (pick.latitude != null) patch.latitude = pick.latitude;
    if (pick.longitude != null) patch.longitude = pick.longitude;
    onChange(patch);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-state" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.state')}</label>
          <select id="wz-state" value={data.state} onChange={(e) => onChange({ state: e.target.value, district: '' })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="wz-district" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.district')}</label>
          <select id="wz-district" value={data.district} onChange={(e) => onChange({ district: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors?.district && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-mandal" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.mandal')}</label>
          <input id="wz-mandal" value={data.mandal} onChange={(e) => onChange({ mandal: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-city" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.cityVillage')}</label>
          <select id="wz-city" value={data.cityVillage} onChange={(e) => onChange({ cityVillage: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors?.cityVillage && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-locality" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.locality')}</label>
          <input id="wz-locality" value={data.locality} onChange={(e) => onChange({ locality: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-landmark" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.landmark')}</label>
          <input id="wz-landmark" value={data.landmark} onChange={(e) => onChange({ landmark: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-pincode" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.pincode')}</label>
          <input id="wz-pincode" value={data.pincode} onChange={(e) => onChange({ pincode: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          {errors?.pincode && <p className="mt-1 text-xs text-red-600">{t('validation.invalidPincode')}</p>}
        </div>
        <div className="relative">
          <label htmlFor="wz-address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.address')}</label>
          <input
            ref={addressRef}
            id="wz-address"
            type="text"
            value={query}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowDropdown(false);
            }}
            placeholder="Start typing to search address..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          {searching && (
            <div className="absolute right-3 top-[2.35rem]">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
            </div>
          )}
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
          {errors?.address && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <MapLocationPicker
        value={data.mapLocation}
        onChange={handleMapPick}
      />
    </div>
  );
}
