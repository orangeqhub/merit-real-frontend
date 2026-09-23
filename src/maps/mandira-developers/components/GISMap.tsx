import React, { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  AttributionControl,
  Marker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { GIS_ANCHOR_LAT, GIS_ANCHOR_LNG, type MapView } from "../utils/gis/geoTransform";

// Ensure Leaflet Map class is available for react-leaflet (Vite ESM quirk).
if (typeof window !== "undefined" && L && !(window as unknown as { L?: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ATTRIBUTION =
  "Esri, Maxar, Earthstar Geographics, and the GIS User Community";

// Plain DivIcon (not the default Leaflet marker images, which need extra
// asset-path config under Vite) -- just a visual pin at the verified
// anchor coordinate, for reference only.
const anchorIcon = L.divIcon({
  className: "gis-anchor-pin",
  html: `<div style="width:14px;height:14px;border-radius:50% 50% 50% 0;background:#ef4444;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 0 4px rgba(0,0,0,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 14],
});

function MapInvalidateSize({ width, height }: { width: number; height: number }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ animate: false });
  }, [map, width, height]);

  return null;
}

interface MapSyncProps {
  center: [number, number];
  zoom: number;
}

function MapSync({ center, zoom }: MapSyncProps) {
  const map = useMap();
  const last = useRef<{ key: string; zoom: number }>({ key: "", zoom: NaN });

  useEffect(() => {
    const key = `${center[0].toFixed(6)},${center[1].toFixed(6)}`;
    if (last.current.key === key && last.current.zoom === zoom) return;
    last.current = { key, zoom };
    map.setView(center, zoom, { animate: false });
  }, [map, center, zoom]);

  return null;
}

/**
 * Non-interactive Esri World Imagery basemap rendered BEHIND the vector
 * SVG (z-index below the layers), kept in exact geographic sync with the
 * SVG's own pan/zoom transform via the `view` prop. Deliberately inert:
 * all pan/zoom/selection interaction happens on the SVG above it.
 */
function GISMap({ width, height, view }: { width: number; height: number; view: MapView }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        // Inert overlay that eats no pointer events, so the SVG above
        // receives every wheel/drag/click. (Leaflet's own pan/zoom
        // listeners are also stripped below.)
        pointerEvents: "none",
      }}
    >
      <MapContainer
        center={view.center}
        zoom={view.zoom}
        zoomControl={false}
        attributionControl={true}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        touchZoom={false}
        style={{ width: "100%", height: "100%", background: "#111" }}
      >
        <AttributionControl position="bottomright" prefix="" />
        <TileLayer url={IMAGERY_URL} attribution={ATTRIBUTION} maxZoom={19} />
        <Marker position={[GIS_ANCHOR_LAT, GIS_ANCHOR_LNG]} icon={anchorIcon} />
        <MapInvalidateSize width={width} height={height} />
        <MapSync center={view.center} zoom={view.zoom} />
      </MapContainer>
    </div>
  );
}

export default React.memo(GISMap);