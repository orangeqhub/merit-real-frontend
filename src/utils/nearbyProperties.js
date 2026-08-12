import { NEARBY_RADIUS_KM } from '../config/location';
import { getPropertyCoordinates, haversineDistanceKm } from './geo';

/**
 * Attach distanceKm and sort: same city first, then nearest → farthest within radius.
 */
export function enrichAndSortNearbyProperties(items, userCoords, detectedCity, radiusKm = NEARBY_RADIUS_KM) {
  if (!userCoords || !Array.isArray(items)) return items || [];

  const cityKey = detectedCity ? String(detectedCity).trim().toLowerCase() : '';
  const radius = Number(radiusKm) || NEARBY_RADIUS_KM;

  const enriched = items.map((item) => {
    const coords = getPropertyCoordinates(item);
    let distanceKm = coords
      ? haversineDistanceKm(userCoords.lat, userCoords.lng, coords.lat, coords.lng)
      : null;
    const sameCity = cityKey && String(item.city || '').trim().toLowerCase() === cityKey;
    if (distanceKm == null && sameCity) distanceKm = 0;
    return distanceKm != null ? { ...item, distanceKm: Number(distanceKm.toFixed(2)) } : item;
  });

  const inRadius = enriched.filter((item) => {
    if (item.distanceKm != null) return item.distanceKm <= radius;
    if (cityKey) return String(item.city || '').trim().toLowerCase() === cityKey;
    return true;
  });

  inRadius.sort((a, b) => {
    const aCity = cityKey && String(a.city || '').trim().toLowerCase() === cityKey ? 0 : 1;
    const bCity = cityKey && String(b.city || '').trim().toLowerCase() === cityKey ? 0 : 1;
    if (aCity !== bCity) return aCity - bCity;
    const aDist = a.distanceKm != null ? a.distanceKm : Number.POSITIVE_INFINITY;
    const bDist = b.distanceKm != null ? b.distanceKm : Number.POSITIVE_INFINITY;
    return aDist - bDist;
  });

  const outsideRadius = enriched.filter((item) => !inRadius.includes(item));
  return [...inRadius, ...outsideRadius];
}
