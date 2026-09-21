/**
 * Shared helpers for turning Google Maps Geocoder/Places results into the
 * structured { city, state, label, latitude, longitude, ... } shape used
 * across the app's location pickers (Navbar's LocationPickerModal and the
 * homepage hero location search).
 */

export function findComponent(components, type) {
  const c = (components || []).find((x) => {
    const types = x.types || x.type || [];
    return types.includes(type);
  });
  if (!c) return '';
  // New API: longName  |  Legacy Geocoder: long_name
  return c.longName || c.long_name || '';
}

export function getCityFromComponents(components) {
  return findComponent(components, 'locality')
    || findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1')
    || findComponent(components, 'administrative_area_level_2')
    || findComponent(components, 'administrative_area_level_1')
    || '';
}

export function getStateFromComponents(components) {
  return findComponent(components, 'administrative_area_level_1');
}

export function getCountryFromComponents(components) {
  return findComponent(components, 'country');
}

export function getAreaFromComponents(components) {
  return findComponent(components, 'sublocality')
    || findComponent(components, 'sublocality_level_1')
    || findComponent(components, 'neighborhood')
    || '';
}

export function getLabelFromComponents(components) {
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
 * downstream selection handlers can consume it uniformly.
 */
export function geocoderResultToPlace(result) {
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
 * Normalise a new-API (AutocompleteSuggestion) or legacy Geocoder-wrapped
 * suggestion into the same internal shape so rendering/selection stays uniform.
 */
export function normalisePlaceSuggestion(suggestion) {
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
 * Build the app's structured location shape from a geocoded/place result's
 * address components + coordinates.
 */
export function buildStructuredLocation({ components, lat, lng, label, description }) {
  const city = getCityFromComponents(components);
  const state = getStateFromComponents(components);
  const country = getCountryFromComponents(components);
  const resolvedLabel = getLabelFromComponents(components) || label || description || city || '';
  return {
    query: resolvedLabel,
    label: resolvedLabel,
    latitude: lat ?? null,
    longitude: lng ?? null,
    city: city || null,
    state: state || null,
    country: country || null,
  };
}
