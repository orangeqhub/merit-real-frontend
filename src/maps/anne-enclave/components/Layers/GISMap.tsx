import React, { useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  AttributionControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapView } from "../../utils/gis/geoTransform";

// Ensure Leaflet Map class is available for react-leaflet (Vite ESM quirk).
if (typeof window !== "undefined" && L && !(window as unknown as { L?: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ATTRIBUTION =
  "Esri, Maxar, Earthstar Geographics, and the GIS User Community";

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
  }, [center, zoom, map]);

  return null;
}

interface Props {
  width: number;
  height: number;
  view: MapView;
}

const GISMap: React.FC<Props> = ({ width, height, view }) => {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        zIndex: 0,
        pointerEvents: "none",
        background: "#111",
      }}
    >
      <MapContainer
        center={view.center}
        zoom={view.zoom}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        touchZoom={false}
        keyboard={false}
        tapHold={false}
        zoomSnap={0}
        zoomDelta={0.1}
        minZoom={2}
        maxZoom={21}
        style={{ width: "100%", height: "100%", background: "#111" }}
      >
        <TileLayer url={IMAGERY_URL} maxZoom={21} attribution={ATTRIBUTION} />
        <AttributionControl position="bottomright" prefix={false} />
        <MapInvalidateSize width={width} height={height} />
        <MapSync center={view.center} zoom={view.zoom} />
      </MapContainer>
    </div>
  );
};

export default React.memo(GISMap);
