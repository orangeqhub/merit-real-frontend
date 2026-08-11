import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink } from 'lucide-react';

const DEFAULT_CENTER = [16.5062, 80.6480]; // Amaravathi / AP region

function parseLatLng(value) {
  if (!value) return null;
  const text = String(value).trim();
  // Supports "lat, lng" and Google Maps style query strings with coords
  const match = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
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
  // de-dupe while preserving order
  return [...new Set(parts)].join(', ');
}

/**
 * Read-only property location map (Leaflet + OpenStreetMap).
 * Uses mapLocation "lat, lng" when present; otherwise geocodes city/address.
 */
export default function PropertyLocationMap({ property, heightClass = 'h-56' }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [coords, setCoords] = useState(() => parseLatLng(property?.mapLocation));
  const [status, setStatus] = useState(() => (parseLatLng(property?.mapLocation) ? 'ready' : 'loading'));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fromMap = parseLatLng(property?.mapLocation);
    if (fromMap) {
      setCoords(fromMap);
      setStatus('ready');
      setError('');
      return undefined;
    }

    const query = buildQueryLabel(property);
    if (!query) {
      setStatus('empty');
      setError('');
      return undefined;
    }

    setStatus('loading');
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
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
        setCoords([Number(hit.lat), Number(hit.lon)]);
        setStatus('ready');
        setError('');
      })
      .catch(() => {
        if (cancelled) return;
        setCoords(DEFAULT_CENTER);
        setStatus('fallback');
        setError('Unable to resolve address — showing regional map.');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    property?.mapLocation,
    property?.address,
    property?.landmark,
    property?.locality,
    property?.locationEn,
    property?.location,
    property?.city,
    property?.mandal,
    property?.district,
    property?.state,
    property?.pincode,
  ]);

  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !coords) return undefined;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        center: coords,
        zoom: status === 'fallback' ? 11 : 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#1e3a5f;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      markerRef.current = L.marker(coords, { icon }).addTo(map);
      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    } else {
      const zoom = status === 'fallback' ? 11 : 15;
      mapInstance.current.setView(coords, zoom);
      if (markerRef.current) markerRef.current.setLatLng(coords);
    }

    return undefined;
  }, [coords, status]);

  useEffect(() => () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      markerRef.current = null;
    }
  }, []);

  const mapsLink = coords
    ? `https://www.google.com/maps?q=${coords[0]},${coords[1]}`
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
