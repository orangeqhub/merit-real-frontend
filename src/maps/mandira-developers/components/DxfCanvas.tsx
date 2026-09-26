import { useMemo, useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import type { Point } from "../types/dxf";
import {
  getPlotNumberMapping,
  getRoads,
  getExistingRoads,
  getOuterRoad,
  getOpenSpaces,
  getUtilities,
} from "../layouts";
import usePanZoom from "../hooks/usePanZoom";
import {
  useLayoutPlotData,
  plotFillColor,
  cardArea,
  plotTypeLabel,
  STATUS_LABELS,
  plotIdentity,
  type PlotIdentity,
} from "../hooks/useLayoutPlotData";
import RoadLayer from "./layers/RoadLayer";
import RegionLayer from "./layers/RegionLayer";
import MapLegend from "./MapLegend";
import PlotTooltip from "./PlotTooltip";
import FeatureTooltip, { type FeatureInfo } from "./FeatureTooltip";
import GISMap from "./GISMap";
import { worldToLatLng, metersPerPixelToZoom, METERS_PER_WORLD_UNIT, type MapView } from "../utils/gis/geoTransform";

interface Props {
  width: number;
  height: number;
  onSelectPlot?: (externalId: string | null, identity?: PlotIdentity) => void;
  onBookPlot?: (externalId: string, identity?: PlotIdentity) => void;
}

// External-id prefix that makes every Mandira plot id globally unique
// across ALL map layouts in the Merit backend's MapPlots table. The seed
// script (merit-real-backend-main/scripts/seedMapPlots.js, "mandira-developers"
// entry) writes MapPlots with this same prefix, so the `externalId` this
// map reports to the parent (and uses for booking) matches the real
// backend row. Source ids here are the generic "p-1".."p-193" form, which
// would collide with other layouts' bare ids without a prefix.
const EXTERNAL_ID_PREFIX = "mnd-";

const DxfCanvas: FC<Props> = ({ width, height, onSelectPlot, onBookPlot }) => {
  const plots = useMemo(() => getPlotNumberMapping(), []);

  // Live per-layout plot data from /map/plots?layout=mandira-developers
  // (the same source of truth the main website's board uses), keyed by the
  // plot number printed on the map. Refreshes itself when the host
  // broadcasts `merit-map-data-updated` (e.g. after an admin Excel upload).
  const { rows: liveByPlotNo } = useLayoutPlotData("mandira-developers");
  const liveFor = (p: { plotNumber: number }) =>
    liveByPlotNo[String(p.plotNumber)] ?? null;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureInfo | null>(null);
  const [featureHoverPos, setFeatureHoverPos] = useState({ x: 0, y: 0 });

  const handleFeatureHover = (feature: FeatureInfo | null, x: number, y: number) => {
    setHoveredFeature(feature);
    if (feature) setFeatureHoverPos({ x, y });
  };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const { zoom, offset, onMouseDown, onMouseMove, onMouseUp, zoomByFactor, setZoom, setOffset } =
    usePanZoom(true, width, height, svgRef);

  // Dynamically calculated, never hardcoded -- deduped on plotNumber so a
  // future data change can never silently double-count a plot.
  const verifiedPlotCount = useMemo(
    () => new Set(plots.map((p) => p.plotNumber)).size,
    [plots]
  );

  // When embedded in the main website's iframe (see merit-real-frontend-main's
  // MapLayoutSection.jsx), report the true plot count/numbers to the parent
  // so its "All plots (N)" display, board tiles and search-matching aren't
  // guessing -- same contract map-vinfra / map-manjunadha-enclave use.
  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        const plotNumbers = [...new Set(plots.map((p) => String(p.plotNumber)))].sort(
          (a, b) => parseInt(a, 10) - parseInt(b, 10)
        );
        window.parent.postMessage(
          { type: "merit-map-plot-count", count: verifiedPlotCount, plotNumbers },
          "*"
        );
      }
    } catch {
      // ignore cross-origin / not embedded
    }
  }, [plots, verifiedPlotCount]);

  // "Fit" must size/center the view around ALL rendered geometry, not just
  // plots -- roads (especially the outer/perimeter road, which legitimately
  // extends further down/out than any plot) and open spaces would
  // otherwise fall outside the visible viewport at Fit zoom even though
  // their geometry is present and correct. This was the actual cause of
  // the bottom section (outer road's lower reach) appearing "missing".
  const layoutBounds = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const extend = (pts: Point[]) => {
      for (const v of pts) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }
    };
    for (const p of plots) extend(p.polygon);
    for (const r of getRoads()) extend(r.polygon);
    for (const r of getExistingRoads()) extend(r.polygon);
    for (const r of getOuterRoad()) extend(r.polygon);
    for (const r of getOpenSpaces()) extend(r.polygon);
    for (const r of getUtilities()) extend(r.polygon);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }, [plots]);

  const padX = width * 0.05;
  const padY = height * 0.05;

  const fitScale = useMemo(() => {
    if (!layoutBounds.width || !layoutBounds.height) return 1;
    return Math.min(
      (width - padX * 2) / layoutBounds.width,
      (height - padY * 2) / layoutBounds.height
    );
  }, [width, height, padX, padY, layoutBounds.width, layoutBounds.height]);

  const offsetX = (width - layoutBounds.width * fitScale) / 2;
  const offsetY = (height - layoutBounds.height * fitScale) / 2;

  const convert = useMemo(
    () => (p: Point) => ({
      x: (p.x - layoutBounds.minX) * fitScale + offsetX,
      y: (p.y - layoutBounds.minY) * fitScale + offsetY,
    }),
    [layoutBounds, fitScale, offsetX, offsetY]
  );

  // Live satellite basemap (GISMap), kept in exact geographic sync with the
  // SVG's own pan/zoom transform. The client-supplied coordinate
  // (16.3749, 80.1791) anchors the COMPLETE existing layout: the world
  // geometry's all-layer bounding-box centroid is placed exactly AT that
  // lat/lng, so the entire Mandira Developers layout sits centered around
  // the reference point on the satellite imagery. Layout geometry itself is
  // untouched -- this only defines where the (already verified) vector
  // shapes land on the globe, at their real 0.0762 m/world-unit scale.
  const anchorWorld = useMemo(
    () => ({
      x: (layoutBounds.minX + layoutBounds.maxX) / 2,
      y: (layoutBounds.minY + layoutBounds.maxY) / 2,
    }),
    [layoutBounds]
  );

  const mapView = useMemo<MapView>(() => {
    const centerWorldX = layoutBounds.minX + (width / 2 - offset.x) / zoom / fitScale - offsetX / fitScale;
    const centerWorldY = layoutBounds.minY + (height / 2 - offset.y) / zoom / fitScale - offsetY / fitScale;

    const { lat, lng } = worldToLatLng(centerWorldX, centerWorldY, anchorWorld);

    const metersPerPx = METERS_PER_WORLD_UNIT / (fitScale * zoom);
    const zoomLevel = metersPerPixelToZoom(metersPerPx, lat);

    return {
      center: [lat, lng],
      // Capped at 19 -- Esri World Imagery has no real tiles past z19 at
      // this location (z20/21 return blank "map data not yet available"
      // placeholders), verified directly against the tile server.
      zoom: Math.min(19, Math.max(2, zoomLevel)),
    };
  }, [layoutBounds, anchorWorld, width, height, offset.x, offset.y, zoom, fitScale, offsetX, offsetY]);

  const fitToLayout = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const zoomToPlot = (plotNumber: number) => {
    const plot = plots.find((p) => p.plotNumber === plotNumber);
    if (!plot) return;
    setSelectedId(plot.id);
    const cx = convert(plot.center).x;
    const cy = convert(plot.center).y;
    const targetZoom = 6;
    setZoom(targetZoom);
    setOffset({
      x: width / 2 - cx * targetZoom,
      y: height / 2 - cy * targetZoom,
    });
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setSearchError(null);
      return;
    }
    // Exact plot-number match only: "1" must never land on 10, 11 or 101.
    const n = /^\d+$/.test(q) ? Number(q) : NaN;
    if (!plots.some((p) => p.plotNumber === n)) {
      setSearchError(`Plot ${q} not found`);
      return;
    }
    setSearchError(null);
    zoomToPlot(n);
  };

  const selectedPlot = plots.find((p) => p.id === selectedId);
  const hoveredPlot = plots.find((p) => p.id === hoveredId);

  // Map -> board sync: whenever the user selects a plot here (click,
  // search), tell the parent (MapLayoutSection.jsx) so its board tile and
  // details panel highlight the same plot. `selectedFromParent` guards
  // against re-posting a selection that itself came FROM a board click/
  // search below -- the parent already knows what it just told us to
  // select, so echoing it back is unnecessary.
  const selectedFromParent = useRef(false);
  useEffect(() => {
    if (selectedFromParent.current) {
      selectedFromParent.current = false;
      return;
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "merit-map-select",
            externalId: selectedPlot ? `${EXTERNAL_ID_PREFIX}${selectedPlot.id}` : null,
            plotNo: selectedPlot ? String(selectedPlot.plotNumber) : null,
          },
          "*"
        );
      }
    } catch {
      // ignore cross-origin / not embedded
    }
    onSelectPlot?.(selectedPlot ? `${EXTERNAL_ID_PREFIX}${selectedPlot.id}` : null, selectedPlot ? plotIdentity(selectedPlot) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Board -> map sync: the parent board (or its search box) selected a
  // plot -- select + zoom to it here the same way this app's own search
  // does, so the map highlights/re-centers on the same plot the board just
  // highlighted.
  // Latest render's zoomToPlot/selection, so a board selection after a
  // resize never zooms with a stale width/height/convert.
  const latest = useRef({ zoomToPlot, selectedId });
  latest.current = { zoomToPlot, selectedId };
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event?.data;
      if (!data || typeof data !== "object" || data.type !== "merit-map-select-plot") return;
      const raw = data.plotNo != null ? String(data.plotNo).trim() : "";
      const plotNo = /^\d+$/.test(raw) ? Number(raw) : NaN;
      const target = plots.find((p) => p.plotNumber === plotNo);
      // Only arm the echo guard when the selection really changes; otherwise
      // the effect above never runs to clear it and the next genuine map
      // click would be swallowed.
      selectedFromParent.current = (target?.id ?? null) !== latest.current.selectedId;
      if (!target) {
        setSelectedId(null);
        return;
      }
      latest.current.zoomToPlot(plotNo);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots]);

  return (
    <div
      className="map-viewport"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#111",
        touchAction: "none",
      }}
    >
      <GISMap width={width} height={height} view={mapView} />

      <MapLegend />

      {hoveredPlot && (
        <PlotTooltip
          plot={{
            plotNumber: hoveredPlot.plotNumber,
            areaSqYd: cardArea(liveFor(hoveredPlot), hoveredPlot.areaSqYd),
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

      {!hoveredPlot && hoveredFeature && (
        <FeatureTooltip
          feature={hoveredFeature}
          x={featureHoverPos.x}
          y={featureHoverPos.y}
        />
      )}

      <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomByFactor(1.2)}
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            +
          </button>
          <div className="h-px w-full bg-gray-200" />
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomByFactor(1 / 1.2)}
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
        style={{ position: "absolute", top: 12, right: 68, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}
      >
        <input
          type="search"
          inputMode="numeric"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchError(null);
            if (!e.target.value.trim()) setSelectedId(null);
          }}
          placeholder="Search Plot..."
          aria-label="Search plot number"
          style={{ padding: "8px 12px", borderRadius: 6, border: "none", width: 220 }}
        />
        {searchError && (
          <div style={{ color: "#fca5a5", fontSize: 11, background: "rgba(24,24,27,0.82)", padding: "2px 6px", borderRadius: 4 }}>
            {searchError}
          </div>
        )}
      </form>

      {(hoveredPlot || selectedPlot) && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 5,
            background: "#1f2937",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            minWidth: 180,
          }}
        >
          {(() => {
            const p = selectedPlot ?? hoveredPlot!;
            const info = liveFor(p);
            const status = String(info?.status || "").toLowerCase();
            return (
              <>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Plot {p.plotNumber}</div>
                <div>Type: {info?.plotType ? info.plotType[0].toUpperCase() + info.plotType.slice(1) : "—"}</div>
                <div>Customer: {info?.customerName || "—"}</div>
                {(() => {
                  // Backend record is authoritative (see cardArea); geometry area
                  // only for a plot that has no record yet.
                  const area = cardArea(info, p.areaSqYd);
                  return <div>Area: {area != null ? Number(area).toFixed(2) : "—"} Sq.Yds</div>;
                })()}
                {plotTypeLabel(info) && <div>Type: {plotTypeLabel(info)}</div>}
                <div>Facing: {info?.facing || "—"}</div>
                <div>Status: {status ? STATUS_LABELS[status] || status[0].toUpperCase() + status.slice(1) : "—"}</div>
                <div>Rate/Sq.Yd: {info?.ratePerSqYd && Number(info.ratePerSqYd) > 0 ? `₹${Number(info.ratePerSqYd).toLocaleString("en-IN")}` : "—"}</div>
                <div>Total Cost: {info?.plotCost && Number(info.plotCost) > 0 ? `₹${Number(info.plotCost).toLocaleString("en-IN")}` : "—"}</div>
                {selectedPlot && selectedPlot.id === p.id && (!info || status === "available") && (
                  <button
                    onClick={() => {
                      try {
                        // externalId (prefix + source id) must match the
                        // backend MapPlots row's externalId (seeded from this
                        // same id via scripts/seedMapPlots.js's
                        // "mandira-developers" entry) -- not the bare plot
                        // number, which isn't globally unique across layouts.
                        window.parent?.postMessage(
                          {
                            type: "merit-map-book",
                            layoutKey: "mandira-developers",
                            externalId: `${EXTERNAL_ID_PREFIX}${p.id}`,
                            plotNo: String(p.plotNumber),
                          },
                          "*"
                        );
                      } catch {
                        // ignore cross-origin / not embedded
                      }
                      onBookPlot?.(`${EXTERNAL_ID_PREFIX}${p.id}`, plotIdentity(p));
                    }}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      background: "#22C55E",
                      color: "#052e16",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Book This Plot
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          background: "transparent",
          display: "block",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          touchAction: "none",
        }}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
          <RegionLayer convert={convert} onHover={handleFeatureHover} />
          <RoadLayer convert={convert} onHover={handleFeatureHover} />

          {plots.map((p) => {
            const pts = p.polygon.map((v) => convert(v)).map((v) => `${v.x},${v.y}`).join(" ");
            const isSelected = p.id === selectedId;
            const isHovered = p.id === hoveredId;
            return (
              <g key={p.id}>
                <polygon
                  points={pts}
                  fill={plotFillColor(liveFor(p))}
                  fillOpacity={isSelected || isHovered ? 1 : 0.88}
                  stroke={isSelected ? "#0891b2" : isHovered ? "#fbbf24" : "#1f2937"}
                  strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 1}
                  cursor="pointer"
                  onMouseEnter={(e) => {
                    setHoveredId(p.id);
                    setHoverPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    setHoverPos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => {
                    setHoveredId((cur) => (cur === p.id ? null : cur));
                  }}
                  onClick={() => setSelectedId(p.id)}
                />
                <text
                  x={convert(p.center).x}
                  y={convert(p.center).y}
                  fontSize={9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#0f172a"
                  pointerEvents="none"
                >
                  {p.plotNumber}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default DxfCanvas;