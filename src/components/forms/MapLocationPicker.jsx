import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [16.3067, 80.4365]; // Guntur / AP area

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

/**
 * Rapido-style location picker: search address, click/drag pin, set selected address.
 */
export default function MapLocationPicker({ value = '', onChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [coords, setCoords] = useState(() => parseLatLng(value) || DEFAULT_CENTER);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return undefined;

    const map = L.map(mapRef.current, {
      center: coords,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#b45309;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    const marker = L.marker(coords, { draggable: true, icon }).addTo(map);
    markerRef.current = marker;
    mapInstance.current = map;

    map.on('click', (e) => {
      const next = [e.latlng.lat, e.latlng.lng];
      marker.setLatLng(next);
      setCoords(next);
      reverseGeocode(next[0], next[1]);
    });

    marker.on('dragend', () => {
      const { lat, lng } = marker.getLatLng();
      setCoords([lat, lng]);
      reverseGeocode(lat, lng);
    });

    reverseGeocode(coords[0], coords[1]);

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const parsed = parseLatLng(value);
    if (!parsed || !mapInstance.current || !markerRef.current) return;
    const [lat, lng] = parsed;
    if (Math.abs(lat - coords[0]) < 0.00001 && Math.abs(lng - coords[1]) < 0.00001) return;
    setCoords(parsed);
    markerRef.current.setLatLng(parsed);
    mapInstance.current.setView(parsed, Math.max(mapInstance.current.getZoom(), 14));
  }, [value]);

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      const address = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedAddress(address);
      setError('');
    } catch {
      setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }

  async function searchAddress() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (!data?.length) {
        setError('Address not found. Try a different search.');
        return;
      }
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      const next = [lat, lng];
      setCoords(next);
      setSelectedAddress(data[0].display_name || q);
      if (markerRef.current) markerRef.current.setLatLng(next);
      if (mapInstance.current) mapInstance.current.setView(next, 16);
    } catch {
      setError('Unable to search address right now.');
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude];
        setCoords(next);
        if (markerRef.current) markerRef.current.setLatLng(next);
        if (mapInstance.current) mapInstance.current.setView(next, 16);
        reverseGeocode(next[0], next[1]);
      },
      () => setError('Unable to fetch current location.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function setSelectedLocation() {
    const [lat, lng] = coords;
    const mapValue = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    onChange?.({
      mapLocation: mapValue,
      address: selectedAddress || mapValue,
      latitude: lat,
      longitude: lng,
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
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress();
              }
            }}
            placeholder="Search address or place"
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={searching}
          onClick={searchAddress}
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {searching ? '…' : 'Search'}
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
        <p><span className="font-medium text-gray-500">Pin:</span> {coords[0].toFixed(6)}, {coords[1].toFixed(6)}</p>
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
