import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { loadGoogleMaps, isGoogleMapsAvailable } from '../../utils/googleMapsLoader';

const DEFAULT_CENTER = { lat: 16.5062, lng: 80.6480 }; // Amaravathi / AP region

function parseLatLng(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function buildQueryLabel(property) {
  const parts = [
    property?.address,
    property?.landmark,
    property?.locality || property?.locationEn || property?.location,
    property?.city,
    property?.mandal,
    property?.district,
    property?.state,
    property?.pincode,
  ]
    .map((p) => (p != null ? String(p).trim() : ''))
    .filter(Boolean);
  return [...new Set(parts)].join(', ');
}

/**
 * Read-only property location map using Google Maps JavaScript API.
 * Falls back to graceful degradation if Google Maps fails to load.
 */
export default function PropertyLocationMap({ property, heightClass = 'h-56' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const [coords, setCoords] = useState(() => {
    // Prefer dedicated lat/lng fields
    const lat = property?.latitude != null ? Number(property.latitude) : null;
    const lng = property?.longitude != null ? Number(property.longitude) : null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return parseLatLng(property?.mapLocation);
  });
  const [status, setStatus] = useState(() => (coords ? 'ready' : 'loading'));
  const [error, setError] = useState('');
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load Google Maps
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled) return;
      setMapsLoaded(!!maps);
    });
    return () => { cancelled = true; };
  }, []);

  // Resolve coordinates if not available
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Already have coordinates from property.latitude/longitude or mapLocation
    if (coords) {
      setStatus('ready');
      return undefined;
    }

    const query = buildQueryLabel(property);
    if (!query) {
      setStatus('empty');
      return undefined;
    }

    setStatus('loading');

    // Try Google Geocoder first if available
    if (mapsLoaded && isGoogleMapsAvailable()) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: query }, (results, geocodeStatus) => {
        if (cancelled) return;
        if (geocodeStatus === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          setCoords({ lat: loc.lat(), lng: loc.lng() });
          setStatus('ready');
        } else {
          setCoords(DEFAULT_CENTER);
          setStatus('fallback');
          setError('Exact pin unavailable — showing regional map.');
        }
      });
      return () => { cancelled = true; controller.abort(); };
    }

    // Fallback to Nominatim
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    )
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled) return;
        const hit = Array.isArray(rows) && rows[0];
        if (!hit) {
          setCoords(DEFAULT_CENTER);
          setStatus('fallback');
          setError('Exact pin unavailable — showing regional map.');
          return;
        }
        setCoords({ lat: Number(hit.lat), lng: Number(hit.lon) });
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setCoords(DEFAULT_CENTER);
        setStatus('fallback');
        setError('Unable to resolve address — showing regional map.');
      });

    return () => { cancelled = true; controller.abort(); };
  }, [coords, property?.mapLocation, property?.latitude, property?.longitude, property?.address, property?.locality, property?.locationEn, property?.city, property?.mandal, property?.district, property?.state, property?.pincode, mapsLoaded]);

  // Initialize/update Google Map
  useEffect(() => {
    if (!mapRef.current || !coords || !mapsLoaded || !isGoogleMapsAvailable()) return undefined;

    const position = new window.google.maps.LatLng(coords.lat, coords.lng);
    const zoom = status === 'fallback' ? 11 : 15;

    if (!mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [],
      });

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: property?.titleEn || 'Property location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1e3a5f',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      mapInstance.current = map;
      markerInstance.current = marker;
    } else {
      mapInstance.current.setCenter(position);
      mapInstance.current.setZoom(zoom);
      if (markerInstance.current) {
        markerInstance.current.setPosition(position);
      }
    }

    return undefined;
  }, [coords, status, mapsLoaded, property?.titleEn]);

  // Cleanup
  useEffect(() => () => {
    markerInstance.current = null;
    mapInstance.current = null;
  }, []);

  const mapsLink = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    : property?.mapLocation
      ? (/^https?:\/\//i.test(property.mapLocation)
          ? property.mapLocation
          : `https://www.google.com/maps?q=${encodeURIComponent(property.mapLocation)}`)
      : buildQueryLabel(property)
        ? `https://www.google.com/maps?q=${encodeURIComponent(buildQueryLabel(property))}`
        : null;

  if (status === 'empty' && !coords) {
    return (
      <div className={`mt-3 flex ${heightClass} items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400`}>
        Location coordinates are not set for this property.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div
        ref={mapRef}
        className={`${heightClass} w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100`}
      />
      {status === 'loading' && (
        <p className="text-xs text-gray-500">Loading map…</p>
      )}
      {error && <p className="text-xs text-amber-700">{error}</p>}
      {mapsLink && (
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
        >
          <ExternalLink size={12} />
          Open in Google Maps
        </a>
      )}
    </div>
  );
}
