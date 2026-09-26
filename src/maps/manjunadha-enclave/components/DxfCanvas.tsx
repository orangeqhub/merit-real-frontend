import { Fragment, useEffect, useMemo, useRef, useState, type FC, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import L from "leaflet";
import { MapContainer, TileLayer, AttributionControl, Polygon, Polyline, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getGisAnchor } from "../layouts";
import { getAnchorWorld, getLayoutFullGeoBounds, type GeoBounds } from "../utils/gis/geoTransform";
import { buildGeoLayers } from "../utils/gis/buildGeoLayers";
import MapLegend from "./MapLegend";
import PlotTooltip from "./PlotTooltip";
import {
  useLayoutPlotData,
  plotFillColor,
  STATUS_LABELS,
} from "../hooks/useLayoutPlotData";

// Ensure Leaflet Map class is available for react-leaflet (Vite ESM quirk).
if (typeof window !== "undefined" && L && !(window as unknown as { L?: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}

interface Props {
  width: number;
  height: number;
  onSelectPlot?: (externalId: string | null) => void;
  onBookPlot?: (externalId: string) => void;
}

/* ============================================================================
 * ARCHITECTURE (per explicit requirement): the Manjunadha Enclave layout is
 * now a georeferenced MAP LAYER, not a screen/SVG overlay:
 *
 *   local vector geometry (inches)
 *         -> GIS transform (buildGeoLayers, single-anchor, no rotation)
 *         -> lat/lng geometry
 *         -> native Leaflet vector layers (Polygon/Polyline/Marker)
 *         -> satellite basemap (Esri World Imagery TileLayer)
 *
 * Leaflet's own MapContainer now owns pan/zoom/projection (dragging=true,
 * scrollWheelZoom=true, native zoomIn()/zoomOut()/fitBounds()) -- there is
 * no separate SVG canvas, no usePanZoom hook, no screen-pixel "convert()"
 * function, and no code that recomputes a CSS position after a pan. Every
 * plot/road/region/boundary/tree is a real Leaflet vector primitive placed
 * at real lat/lng coordinates, so it moves and scales automatically as part
 * of Leaflet's own projection whenever the user pans or zooms the map --
 * the same mechanism that moves the satellite tiles.
 * ==========================================================================*/

const ROAD_COLORS: Record<string, string> = {
  "proposed-9m": "#94a3b8",
  "proposed-12m": "#64748b",
  "existing-donka": "#3f3f46",
};

const IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ATTRIBUTION = "Esri, Maxar, Earthstar Geographics, and the GIS User Community";
// Esri World Imagery's real (non-placeholder) tile coverage for this rural
// area runs out above zoom 18 -- higher zooms return blank tiles. This is a
// data-coverage ceiling, not an invented scale.
const MAX_REAL_IMAGERY_ZOOM = 18;
// The fitted layout already sits at ~z18, so the map itself must allow
// zooming further: Leaflet upscales the z18 imagery (maxNativeZoom) instead
// of requesting blank z19+ tiles, while the vector plots stay sharp.
const MAX_MAP_ZOOM = 21;

function treeIcon(seed: number) {
  const scale = 0.85 + (seed % 5) * 0.06;
  const html = `
    <div style="transform:scale(${scale.toFixed(2)});transform-origin:center;">
      <svg width="18" height="20" viewBox="-9 -13 18 20">
        <ellipse cx="1" cy="5.5" rx="6.5" ry="2" fill="#000" opacity="0.14"/>
        <rect x="-0.9" y="1" width="1.8" height="4.5" rx="0.6" fill="#5d4630"/>
        <circle cx="-3.4" cy="-4.6" r="4.2" fill="#3f6b30"/>
        <circle cx="3.5" cy="-4.3" r="4.1" fill="#3f6b30"/>
        <circle cx="0" cy="-6.8" r="4.9" fill="#4e7d3a"/>
        <circle cx="-2.7" cy="-6.2" r="3.7" fill="#5b8f43"/>
        <circle cx="2" cy="-7.3" r="3.4" fill="#5b8f43"/>
      </svg>
    </div>`;
  return L.divIcon({ className: "manjunadha-tree", html, iconSize: [18, 20], iconAnchor: [9, 16] });
}

function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map]);
  return null;
}

/** Calls Leaflet's own invalidateSize() whenever the map's actual container
 * element changes size, so Leaflet recomputes its internal pixel
 * origin/size and every plot/road/region stays under the cursor exactly
 * where it's drawn. A plain `window.resize` listener alone misses this
 * embedded in an iframe: the parent page's own layout (e.g. the search bar
 * area reflowing, an image finishing load, a flex container changing the
 * iframe's rendered height) can resize the iframe's CSS box without the
 * iframe's own `window` ever firing a resize event, leaving Leaflet's
 * cached size stale and its hit-testing/plot positions off from where
 * they're actually painted. A ResizeObserver on the real container
 * element catches every one of those cases, not just OS-level window
 * resizes. */
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onResize);
      observer.observe(map.getContainer());
    }

    return () => {
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [map]);
  return null;
}

function MapViewReporter({ onView }: { onView: (center: [number, number], zoom: number) => void }) {
  const map = useMapEvents({
    moveend: () => onView([map.getCenter().lat, map.getCenter().lng], map.getZoom()),
    zoomend: () => onView([map.getCenter().lat, map.getCenter().lng], map.getZoom()),
  });
  useEffect(() => {
    onView([map.getCenter().lat, map.getCenter().lng], map.getZoom());
  }, [map, onView]);
  return null;
}

const SHOW_GIS_DEBUG = typeof window !== "undefined" && window.location.search.includes("gisDebug");

const TOOLBAR_BUTTON_STYLE: React.CSSProperties = {
  width: 30,
  height: 30,
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 6,
  background: "rgba(24,24,27,0.9)",
  color: "#e5e7eb",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};

// width/height are accepted for backward-compat with App.tsx's props but no
// longer used directly -- the map now fills its container at 100%/100% via
// CSS and calls Leaflet's own invalidateSize on resize (see ResizeReporter),
// rather than driving an SVG viewBox from explicit pixel dimensions.
const DxfCanvas: FC<Props> = ({ onSelectPlot, onBookPlot }) => {
  const gisAnchor = useMemo(() => getGisAnchor(), []);
  const localAnchor = useMemo(() => getAnchorWorld(), []);
  const geo = useMemo(() => (gisAnchor ? buildGeoLayers(localAnchor) : null), [gisAnchor, localAnchor]);
  const initialBounds = useMemo<GeoBounds | null>(() => getLayoutFullGeoBounds(), []);

  const plots = geo?.plots ?? [];

  // Live per-layout plot data from /map/plots?layout=manjunadha-enclave (the
  // same source of truth the main website's board uses), keyed by the plot
  // number printed on the map. Refreshes itself when the host broadcasts
  // `merit-map-data-updated` (e.g. after an admin Excel upload).
  const { rows: liveByPlotNo } = useLayoutPlotData("manjunadha-enclave");
  const liveFor = (p: { plotNumber: number | string }) =>
    liveByPlotNo[String(p.plotNumber)] ?? null;

  // "67&68" is one drawn polygon/board tile but two real plot numbers, so
  // the displayed/reported total must count it as 2, not 1 -- otherwise
  // "All plots (N)" undercounts the true 68-plot inventory by one.
  const plotUnitCount = plots.reduce((sum, p) => sum + (String(p.plotNumber).includes("&") ? 2 : 1), 0);

  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        const plotNumbers = [...new Set(plots.map((p) => String(p.plotNumber)))].sort(
          (a, b) => parseInt(a, 10) - parseInt(b, 10)
        );
        window.parent.postMessage({ type: "merit-map-plot-count", count: plotUnitCount, plotNumbers }, "*");
      }
    } catch {
      // ignore cross-origin
    }
  }, [plots, plotUnitCount]);

  // Board -> map sync: the host board (or its search box) selected a plot —
  // select + zoom to it here the same way this app's own search does.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event?.data;
      if (!data || typeof data !== "object" || data.type !== "merit-map-select-plot") return;
      const externalId = String(data.externalId || "");
      const rawPlotNo = String(data.plotNo || "").toUpperCase().replace(/\s+/g, "");
      if (!externalId && !rawPlotNo) {
        setSelectedId(null);
        return;
      }
      const byId = externalId ? plots.find((p) => p.id === externalId) : undefined;
      const byNumber = rawPlotNo
        ? plots.find((p) => String(p.plotNumber).toUpperCase() === rawPlotNo)
        : undefined;
      const target = byId || byNumber || null;
      if (!target) return;
      selectedFromParent.current = true;
      zoomToPlot(String(target.plotNumber));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [plots]);

  const mapRef = useRef<L.Map | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [liveMapView, setLiveMapView] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Board -> map sync guard: a `merit-map-select-plot` selection that came
  // FROM the host board must not be echoed back to the parent as a fresh
  // map selection (the parent already knows what it just told us to select).
  const selectedFromParent = useRef(false);

  const zoomIn = () => mapRef.current?.zoomIn(1);
  const zoomOut = () => mapRef.current?.zoomOut(1);
  const fitToLayout = () => {
    if (initialBounds) mapRef.current?.fitBounds(initialBounds, { animate: false });
  };

  // Map -> board sync: a plot selected directly on the map (click or this
  // app's own search box) must highlight the same tile + details on the
  // host board. `selectedFromParent` suppresses the echo for board-initiated
  // selections.
  const sendSelectToParent = (plot: { id: string; plotNumber: number | string }) => {
    if (selectedFromParent.current) {
      selectedFromParent.current = false;
      return;
    }
    onSelectPlot?.(plot.id);
    if (!(window.parent && window.parent !== window)) return;
    try {
      window.parent.postMessage(
        {
          type: "merit-map-select",
          // Source ids are already globally namespaced ("manjunadha-plot-024"),
          // so scripts/seedMapPlots.js stores them as the backend externalId
          // verbatim (no extra prefix needed).
          externalId: plot.id,
          plotNo: String(plot.plotNumber),
        },
        "*"
      );
    } catch {
      // ignore cross-origin / not embedded
    }
  };

  const zoomToPlot = (plotNumber: string) => {
    const plot = plots.find((p) => String(p.plotNumber) === plotNumber);
    if (!plot) {
      setSearchError(`Plot ${plotNumber} not found`);
      return;
    }
    setSearchError(null);
    setSelectedId(plot.id);
    mapRef.current?.setView(plot.center, 20, { animate: false });
    sendSelectToParent(plot);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const raw = query.trim().toUpperCase().replace(/\s+/g, "");
    // Exact match on the printed number; "024" is plot 24, "67&68" stays as is.
    const q = /^\d+$/.test(raw) ? String(Number(raw)) : raw;
    if (!q) {
      setSearchError(null);
      return;
    }
    try {
      if (window.parent && window.parent !== window) {
        // Let the host board filter + select the same plot (its search box
        // and the map's own search box share one Search -> Map -> Board ->
        // Details flow).
        window.parent.postMessage({ type: "merit-map-search", query: q }, "*");
      }
    } catch {
      // ignore cross-origin
    }
    zoomToPlot(q);
  };

  const selectedPlot = plots.find((p) => p.id === selectedId);
  const hoveredPlot = plots.find((p) => p.id === hoveredId);
  const activePlot = selectedPlot ?? hoveredPlot;

  return (
    <div
      className="map-viewport"
      style={{ position: "relative", zIndex: 0, width: "100%", height: "100%", overflow: "hidden", background: "#111" }}
    >
      {!geo && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          GIS not configured for this layout.
        </div>
      )}

      {geo && initialBounds && (
        <MapContainer
          bounds={initialBounds}
          zoomControl={false}
          attributionControl={false}
          dragging
          scrollWheelZoom
          doubleClickZoom
          boxZoom={false}
          touchZoom
          keyboard
          minZoom={2}
          maxZoom={MAX_MAP_ZOOM}
          // Fractional snap so Fit frames the whole layout tightly instead of
          // rounding down to a whole zoom level; +/- still step one level.
          zoomSnap={0.25}
          zoomDelta={1}
          style={{ width: "100%", height: "100%", background: "#111" }}
        >
          <TileLayer
            url={IMAGERY_URL}
            maxNativeZoom={MAX_REAL_IMAGERY_ZOOM}
            maxZoom={MAX_MAP_ZOOM}
            attribution={ATTRIBUTION}
          />
          <AttributionControl position="bottomright" prefix={false} />
          <MapRefSetter mapRef={mapRef} />
          <MapResizeHandler />
          {SHOW_GIS_DEBUG && <MapViewReporter onView={(center, zoom) => setLiveMapView({ center, zoom })} />}

          {/* Boundary tree ring (decorative, geographically anchored markers) */}
          <Polyline positions={geo.boundaryPolyline} pathOptions={{ color: "#3f6b30", opacity: 0.35, weight: 1 }} />
          {geo.trees.map((t, i) => (
            <Marker key={i} position={t.pos} icon={treeIcon(t.seed)} interactive={false} />
          ))}

          {/* Open Space / Utility -- name shown on hover only, not painted permanently */}
          {geo.openSpaces.map((r) => (
            <Polygon key={r.id} positions={r.positions} pathOptions={{ fillColor: "#2E7D32", fillOpacity: 0.9, color: "#1f2937", weight: 0.5 }}>
              <Tooltip direction="center" className="manjunadha-region-tooltip">
                <span style={{ whiteSpace: "pre" }}>{r.label}</span>
              </Tooltip>
            </Polygon>
          ))}
          {geo.utilities.map((r) => (
            <Polygon key={r.id} positions={r.positions} pathOptions={{ fillColor: "#9C27B0", fillOpacity: 0.9, color: "#1f2937", weight: 0.5 }}>
              <Tooltip direction="center" className="manjunadha-region-tooltip">
                <span style={{ whiteSpace: "pre" }}>{r.label}</span>
              </Tooltip>
            </Polygon>
          ))}

          {/* Proposed roads + Existing Donka Road -- name shown on hover only */}
          {[...geo.roads, ...geo.existingRoads].map((r) => (
            <Fragment key={r.id}>
              <Polygon
                positions={r.positions}
                pathOptions={{ fillColor: ROAD_COLORS[r.type] ?? "#94a3b8", fillOpacity: 0.95, color: "#1f2937", weight: 0.5 }}
              >
                {r.label && (
                  <Tooltip direction="center" className="manjunadha-road-label">
                    {r.label}
                  </Tooltip>
                )}
              </Polygon>
              {r.centerlineSegments.map((seg, i) => (
                <Polyline
                  key={i}
                  positions={[seg.from, seg.to]}
                  pathOptions={{ color: "#ffffff", weight: 1.5, dashArray: "8 6", opacity: 0.7 }}
                />
              ))}
            </Fragment>
          ))}

          {/* Plots */}
          {plots.map((p) => {
            const isSelected = p.id === selectedId;
            const isHovered = p.id === hoveredId;
            return (
              <Polygon
                key={p.id}
                positions={p.positions}
                pathOptions={{
                  fillColor: plotFillColor(liveFor(p)),
                  fillOpacity: isSelected || isHovered ? 1 : 0.88,
                  color: isSelected ? "#0891b2" : isHovered ? "#fbbf24" : "#1f2937",
                  weight: isSelected ? 2 : isHovered ? 1.5 : 1,
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    setHoveredId(p.id);
                    const oe = e.originalEvent as MouseEvent;
                    setHoverPos({ x: oe.clientX, y: oe.clientY });
                  },
                  mousemove: (e) => {
                    const oe = e.originalEvent as MouseEvent;
                    setHoverPos({ x: oe.clientX, y: oe.clientY });
                  },
                  mouseout: () => setHoveredId((cur) => (cur === p.id ? null : cur)),
                  click: () => {
                    setSelectedId(p.id);
                    sendSelectToParent(p);
                  },
                }}
              >
                <Tooltip permanent direction="center" className="manjunadha-plot-label" interactive={false}>
                  {p.plotNumber}
                </Tooltip>
              </Polygon>
            );
          })}
        </MapContainer>
      )}

      <MapLegend />

      {hoveredPlot && (
        <PlotTooltip
          plot={{
            plotNumber: hoveredPlot.plotNumber,
            areaSqYd: hoveredPlot.areaSqYd,
            status: liveFor(hoveredPlot)?.status ?? null,
            facing: liveFor(hoveredPlot)?.facing ?? null,
            ratePerSqYd: liveFor(hoveredPlot)?.ratePerSqYd ?? null,
            plotCost: liveFor(hoveredPlot)?.plotCost ?? null,
            customerName: liveFor(hoveredPlot)?.customerName ?? null,
          }}
          x={hoverPos.x}
          y={hoverPos.y}
        />
      )}

      {/* pointerEvents:none on the wrapper (auto-sized to its flex content,
          never full-width/full-height) plus pointerEvents:auto on every
          interactive child guarantees this control bar can never become an
          invisible click/hover-blocking box over the map, regardless of
          any future spacing/wrapping change. */}
      <div
        style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, display: "flex", gap: 8, alignItems: "center", pointerEvents: "none" }}
      >
        <div style={{ background: "rgba(24,24,27,0.82)", color: "#e5e7eb", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "Arial, Helvetica, sans-serif", pointerEvents: "auto" }}>
          All plots ({plotUnitCount})
        </div>
        {SHOW_GIS_DEBUG && gisAnchor && (
          <div
            style={{
              background: "rgba(24,24,27,0.9)",
              color: "#e5e7eb",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 11,
              lineHeight: 1.6,
              fontFamily: "monospace",
            }}
          >
            <div>
              <strong>GIS Status:</strong> APPROXIMATE
            </div>
            <div>
              <strong>Anchor:</strong> {gisAnchor.lat.toFixed(6)}, {gisAnchor.lng.toFixed(6)}
            </div>
            <div>
              <strong>Local Anchor:</strong> x={localAnchor.x.toFixed(2)}, y={localAnchor.y.toFixed(2)}
            </div>
            <div>
              <strong>Transform:</strong> Single Anchor
            </div>
            <div>
              <strong>Scale:</strong> 0.0254 m/unit (1 unit = 1 inch, exact)
            </div>
            <div>
              <strong>Rotation:</strong> 0°
            </div>
            {initialBounds && (
              <div>
                <strong>Geographic Bounds:</strong> [{initialBounds[0][0].toFixed(5)}, {initialBounds[0][1].toFixed(5)}] to [
                {initialBounds[1][0].toFixed(5)}, {initialBounds[1][1].toFixed(5)}]
              </div>
            )}
            {liveMapView && (
              <>
                <div>
                  <strong>Map Center:</strong> {liveMapView.center[0].toFixed(6)}, {liveMapView.center[1].toFixed(6)}
                </div>
                <div>
                  <strong>Map Zoom:</strong> {liveMapView.zoom.toFixed(2)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Same pointerEvents guarantee as the toolbar above: the form itself
          is a shrink-to-fit absolutely positioned box (no explicit width),
          but pointerEvents:none on it plus auto on the input/button/error
          text removes any possibility of it silently intercepting hover on
          the map beneath it. */}
      <div className="pointer-events-none absolute top-3 right-3 z-[1000] flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={zoomIn}
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            +
          </button>
          <div className="h-px w-full bg-gray-200" />
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={zoomOut}
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            −
          </button>
        </div>
        <button
          type="button"
          aria-label="Reset view"
          title="Fit to view"
          onClick={fitToLayout}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:bg-gray-100"
        >
          <Crosshair size={18} />
        </button>
      </div>

      <form
        onSubmit={handleSearch}
        style={{ position: "absolute", top: 12, right: 68, zIndex: 1000, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", pointerEvents: "none" }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchError(null);
              if (!e.target.value.trim()) setSelectedId(null);
            }}
            placeholder="Search Plot... (e.g. 24, 67&68)"
            className="manjunadha-search-input"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid transparent", width: 220, pointerEvents: "auto" }}
          />
          <button type="submit" className="manjunadha-toolbar-btn" style={{ ...TOOLBAR_BUTTON_STYLE, width: "auto", padding: "0 14px", pointerEvents: "auto" }}>
            Go
          </button>
        </div>
        {searchError && (
          <div style={{ color: "#fca5a5", fontSize: 11, background: "rgba(24,24,27,0.82)", padding: "2px 6px", borderRadius: 4 }}>
            {searchError}
          </div>
        )}
      </form>

      {activePlot && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 1000,
            background: "#1f2937",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 13,
            minWidth: 200,
          }}
        >
          {selectedPlot && (
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Close details"
              style={{ position: "absolute", top: 6, right: 8, background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14 }}
            >
              {"✕"}
            </button>
          )}
          {(() => {
            const p = selectedPlot ?? hoveredPlot!;
            const info = liveFor(p);
            const status = String(info?.status || "").toLowerCase();
            return (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Plot {p.plotNumber}</div>
                <div>Customer: {info?.customerName || "—"}</div>
                <div>Area: {p.areaSqYd != null ? p.areaSqYd.toFixed(2) : "-"} Sq.Yds</div>
                <div style={{ color: "#9ca3af", marginTop: 2 }}>
                  Facing: {info?.facing || "—"}
                </div>
                <div style={{ color: "#9ca3af" }}>
                  Status:{" "}
                  {status ? STATUS_LABELS[status] || status[0].toUpperCase() + status.slice(1) : "—"}
                </div>
                <div style={{ color: "#9ca3af" }}>
                  Rate/Sq.Yd:{" "}
                  {info?.ratePerSqYd && Number(info.ratePerSqYd) > 0
                    ? `₹${Number(info.ratePerSqYd).toLocaleString("en-IN")}`
                    : "—"}
                </div>
                <div style={{ color: "#9ca3af" }}>
                  Total Cost:{" "}
                  {info?.plotCost && Number(info.plotCost) > 0
                    ? `₹${Number(info.plotCost).toLocaleString("en-IN")}`
                    : "—"}
                </div>
                {selectedPlot && (!info || status === "available") && (
            <button
              onClick={() => {
                try {
                  // externalId must match the backend MapPlots row created by
                  // scripts/seedMapPlots.js ("manjunadha-plot-XXX", from this
                  // plot's own source id) -- NOT the bare plot number, which
                  // is not globally unique across layouts and would look up
                  // the wrong plot (or none) on the booking page.
                  window.parent?.postMessage(
                    {
                      type: "merit-map-book",
                      externalId: selectedPlot.id,
                      plotNo: String(selectedPlot.plotNumber),
                    },
                    "*"
                  );
                } catch {
                  // ignore cross-origin / not embedded
                }
                onBookPlot?.(selectedPlot.id);
              }}
              style={{
                marginTop: 10,
                width: "100%",
                background: "#1d4ed8",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Book this plot
            </button>
              )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default DxfCanvas;
