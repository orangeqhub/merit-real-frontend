// Approximate coordinates for every city in src/data/locations.js's CITIES
// list. Properties may also carry precise coordinates in `mapLocation`.
export const CITY_COORDINATES = {
  Guntur: { lat: 16.3067, lng: 80.4365 },
  Vijayawada: { lat: 16.5062, lng: 80.648 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Ongole: { lat: 15.5057, lng: 80.0499 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Warangal: { lat: 17.9784, lng: 79.5941 },
  Tenali: { lat: 16.243, lng: 80.64 },
  Mangalagiri: { lat: 16.4307, lng: 80.5525 },
};

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Parse "lat,lng" or Google Maps-style coordinate strings. */
export function parseMapLocation(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Coordinates for a property — mapLocation first, then city centroid lookup. */
export function getPropertyCoordinates(property) {
  const fromMap = parseMapLocation(property?.mapLocation);
  if (fromMap) return fromMap;
  const city = property?.city ? String(property.city).trim() : '';
  return city && CITY_COORDINATES[city] ? CITY_COORDINATES[city] : null;
}

/**
 * Reverse-geocodes a coordinate to a city/district/state via the free
 * OpenStreetMap Nominatim API — no API key required. Only ever called in
 * direct response to a user clicking "Use My Current Location", never
 * automatically.
 */
export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const address = data.address || {};
  const city = address.city || address.town || address.village || address.county || '';
  const district = address.state_district || address.county || '';
  const state = address.state || '';
  const label = [city, state].filter(Boolean).join(', ') || data.display_name || '';
  return { city, district, state, label };
}
