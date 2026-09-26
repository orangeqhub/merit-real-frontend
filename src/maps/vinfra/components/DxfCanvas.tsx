import { useEffect, useMemo, useRef, useState, type FC, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Crosshair } from "lucide-react";
import type { Point } from "../types/dxf";
import {
  getPlotNumberMapping,
  getRoads,
  getExistingRoads,
  getOuterRoad,
  getOpenSpaces,
  getUtilities,
  getApplicantArea,
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
import FeatureTooltip, { type TooltipFeatureInfo } from "./FeatureTooltip";
import GISMap from "./GISMap";
import { worldToLatLng, metersPerPixelToZoom, METERS_PER_WORLD_UNIT, type MapView } from "../utils/gis/geoTransform";
import sourceOverviewImg from "../assets/source-overview.png";

interface Props {
  width: number;
  height: number;
  onSelectPlot?: (externalId: string | null, identity?: PlotIdentity) => void;
  onBookPlot?: (externalId: string, identity?: PlotIdentity) => void;
}

// Dev-only diagnostic: overlays tools/overview_2x.png (the full-page PDF
// render this layout was digitized from) at ~50% opacity on top of the
// vector geometry, so real local discrepancies can be found by eye instead
// of guessed at from a static screenshot. Gated behind a query param so it
// never ships to production by default. See VINFRA_SOURCE_NOTES.md.
const SHOW_SOURCE_OVERLAY_TOGGLE =
  typeof window !== "undefined" && window.location.search.includes("sourceOverlay");

// Best-effort initial alignment (world units = feet * 4, y increasing
// south/down, no rotation -- matches generate-layout.mjs's own coordinate
// system). Derived by matching the source image's own visible landmarks
// (Open Space's "175'" edge, the EXISTING ROAD band, plot block 196's row)
// against their known world coordinates from openSpaces.json/boundary.json.
// This is a starting point for visual nudging, not a precision registration
// -- use the on-screen Offset X/Y and Scale X/Y controls to fine-tune while
// comparing against the vector live in the browser.
const SOURCE_IMG_NATURAL_WIDTH = 3312;
const SOURCE_IMG_NATURAL_HEIGHT = 2592;
const DEFAULT_OVERLAY = {
  offsetX: -290, // world-x of the image's left edge (px 0)
  offsetY: -719, // world-y of the image's top edge (px 0)
  scaleX: 1.462, // world units per source-image pixel, horizontal
  scaleY: 1.397, // world units per source-image pixel, vertical
  opacity: 0.5,
};

const DxfCanvas: FC<Props> = ({ width, height, onSelectPlot, onBookPlot }) => {
  const plots = useMemo(() => getPlotNumberMapping(), []);

  // Live per-layout plot data from /map/plots?layout=vinfra (the same source
  // of truth the main website's board uses), keyed by the plot number printed
  // on the map. Refreshes itself when the host broadcasts
  // `merit-map-data-updated` (e.g. after an admin Excel upload).
  const { rows: liveByPlotNo } = useLayoutPlotData("vinfra");
  const liveFor = (p: { plotNumber: number }) =>
    liveByPlotNo[String(p.plotNumber)] ?? null;
  // Dynamically calculated, never hardcoded -- deduped on plotNumber so a
  // future data change can never silently double-count a plot.
  const verifiedPlotCount = useMemo(
    () => new Set(plots.map((p) => p.plotNumber)).size,
    [plots]
  );

  // When embedded in the main website's iframe (see merit-real-frontend-main's
  // MapLayoutSection.jsx), report the true plot count/numbers to the parent
  // so its "All plots (N)" display and search-matching aren't guessing --
  // same contract map-manjunadha-enclave's DxfCanvas.tsx uses.
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSourceOverlay, setShowSourceOverlay] = useState(false);
  const [overlay, setOverlay] = useState(DEFAULT_OVERLAY);

  // Hover state for non-plot geometry (roads, Open Space, Utility,
  // Applicant Area) -- kept separate from the plot hover state above so
  // hovering a road never clears/competes with a selected plot's details
  // panel, and vice versa. id + tooltip info are tracked together so a
  // stray onMouseLeave from a feature that's no longer the current one
  // (e.g. rapidly crossing an edge) can't clear a newer hover.
  const [hoveredFeatureState, setHoveredFeatureState] = useState<{
    id: string;
    info: TooltipFeatureInfo;
  } | null>(null);
  const [featureHoverPos, setFeatureHoverPos] = useState({ x: 0, y: 0 });

  const handleFeatureHover = (id: string, title: string, lines: string[], e: ReactMouseEvent) => {
    setHoveredFeatureState({ id, info: { title, lines } });
    setFeatureHoverPos({ x: e.clientX, y: e.clientY });
  };
  const handleFeatureMove = (e: ReactMouseEvent) => {
    setFeatureHoverPos({ x: e.clientX, y: e.clientY });
  };
  const handleFeatureLeave = (id: string) => {
    setHoveredFeatureState((cur) => (cur?.id === id ? null : cur));
  };

  const svgRef = useRef<SVGSVGElement | null>(null);
  const { zoom, offset, onMouseDown, onMouseMove, onMouseUp, zoomByFactor, setZoom, setOffset } =
    usePanZoom(true, width, height, svgRef);

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
    for (const r of getApplicantArea()) extend(r.polygon);
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
  // SVG's own pan/zoom transform. The verified coordinate is the ORR
  // (Outer Ring Road)'s own real-world location, so anchorWorld must be
  // the ORR's local position -- NOT the layout bounds' centroid -- or the
  // vector ORR won't land on the real road in the satellite imagery.
  // Anchored to the ORR band's own centerline (its key shape-defining
  // points, i.e. excluding the north/south cap extensions that run past
  // the actual plotted layout -- see generate-layout.mjs's Outer Ring Road
  // section), which is the same source of truth the ORR polygon itself is
  // built from.
  const anchorWorld = useMemo(() => {
    const orr = getOuterRoad()[0];
    const key = orr?.centerline?.slice(1, -1) ?? [];
    if (!key.length) return { x: (layoutBounds.minX + layoutBounds.maxX) / 2, y: (layoutBounds.minY + layoutBounds.maxY) / 2 };
    return {
      x: key.reduce((s, p) => s + p.x, 0) / key.length,
      y: key.reduce((s, p) => s + p.y, 0) / key.length,
    };
  }, [layoutBounds]);

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
            externalId: selectedPlot ? selectedPlot.id : null,
            plotNo: selectedPlot ? String(selectedPlot.plotNumber) : null,
          },
          "*"
        );
      }
    } catch {
      // ignore cross-origin / not embedded
    }
    onSelectPlot?.(selectedPlot ? selectedPlot.id : null, selectedPlot ? plotIdentity(selectedPlot) : undefined);
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

      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 5,
          background: "rgba(24, 24, 27, 0.78)",
          color: "#e5e7eb",
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        All plots ({verifiedPlotCount})
      </div>

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

      {hoveredFeatureState && (
        <FeatureTooltip
          feature={hoveredFeatureState.info}
          x={featureHoverPos.x}
          y={featureHoverPos.y}
        />
      )}

      {SHOW_SOURCE_OVERLAY_TOGGLE && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            zIndex: 6,
            background: "rgba(24, 24, 27, 0.92)",
            color: "#e5e7eb",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontFamily: "monospace",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 230,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={showSourceOverlay}
              onChange={(e) => setShowSourceOverlay(e.target.checked)}
            />
            Source overlay (dev only)
          </label>
          {showSourceOverlay && (
            <>
              {(
                [
                  ["offsetX", -10],
                  ["offsetY", -10],
                  ["scaleX", -0.01],
                  ["scaleY", -0.01],
                ] as const
              ).map(([key, step]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 56 }}>{key}</span>
                  <button onClick={() => setOverlay((o) => ({ ...o, [key]: +(o[key] + step).toFixed(3) }))}>
                    -
                  </button>
                  <span style={{ width: 56, textAlign: "center" }}>{overlay[key].toFixed(3)}</span>
                  <button onClick={() => setOverlay((o) => ({ ...o, [key]: +(o[key] - step).toFixed(3) }))}>
                    +
                  </button>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 56 }}>opacity</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlay.opacity}
                  onChange={(e) => setOverlay((o) => ({ ...o, opacity: Number(e.target.value) }))}
                  style={{ flex: 1 }}
                />
                <span>{overlay.opacity.toFixed(2)}</span>
              </div>
              <button onClick={() => setOverlay(DEFAULT_OVERLAY)}>Reset alignment</button>
            </>
          )}
        </div>
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
                <div>Layout: ORR Nandana Vanam @ Saripudi</div>
                <div>Customer: {info?.customerName || "—"}</div>
                {(() => {
                  // Backend record is authoritative (see cardArea); geometry area
                  // only for a plot that has no record yet.
                  const area = cardArea(info, p.areaSqYd);
                  return <div>Area: {area != null ? Number(area).toFixed(2) : "—"} Sq.Yds</div>;
                })()}
                {plotTypeLabel(info) && <div>Type: {plotTypeLabel(info)}</div>}
                <div>Facing: {info?.facing || "—"}</div>
                <div>
                  Status:{" "}
                  {status ? STATUS_LABELS[status] || status[0].toUpperCase() + status.slice(1) : "—"}
                </div>
                <div>
                  Rate/Sq.Yd:{" "}
                  {info?.ratePerSqYd && Number(info.ratePerSqYd) > 0
                    ? `₹${Number(info.ratePerSqYd).toLocaleString("en-IN")}`
                    : "—"}
                </div>
                <div>
                  Total Cost:{" "}
                  {info?.plotCost && Number(info.plotCost) > 0
                    ? `₹${Number(info.plotCost).toLocaleString("en-IN")}`
                    : "—"}
                </div>
                {!info && p.landUse && (
                  <div>Land Use: {p.landUse[0].toUpperCase() + p.landUse.slice(1).replace("-", " ")}</div>
                )}
                {p.needsReview && (
                  <div style={{ color: "#fbbf24", marginTop: 4 }}>
                    ⚠ dimensions approximate — see source notes
                  </div>
                )}
                {selectedPlot && selectedPlot.id === p.id && (!info || status === "available") && (
                  <button
                    onClick={() => {
                      try {
                        // externalId must match the backend MapPlots row's
                        // externalId (seeded from this same plot.id via
                        // scripts/seedMapPlots.js's "vinfra" entry) -- not
                        // the bare plot number, which isn't globally unique
                        // across layouts.
                        window.parent?.postMessage(
                          { type: "merit-map-book", externalId: p.id, plotNo: String(p.plotNumber) },
                          "*"
                        );
                      } catch {
                        // ignore cross-origin / not embedded
                      }
                      onBookPlot?.(p.id, plotIdentity(p));
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
          {showSourceOverlay &&
            (() => {
              const topLeft = convert({ x: overlay.offsetX, y: overlay.offsetY });
              const bottomRight = convert({
                x: overlay.offsetX + SOURCE_IMG_NATURAL_WIDTH * overlay.scaleX,
                y: overlay.offsetY + SOURCE_IMG_NATURAL_HEIGHT * overlay.scaleY,
              });
              return (
                <image
                  href={sourceOverviewImg}
                  x={topLeft.x}
                  y={topLeft.y}
                  width={bottomRight.x - topLeft.x}
                  height={bottomRight.y - topLeft.y}
                  opacity={overlay.opacity}
                  preserveAspectRatio="none"
                  pointerEvents="none"
                />
              );
            })()}
          <RegionLayer
            convert={convert}
            hoveredId={hoveredFeatureState?.id ?? null}
            onHover={handleFeatureHover}
            onMove={handleFeatureMove}
            onLeave={handleFeatureLeave}
          />
          <RoadLayer
            convert={convert}
            hoveredId={hoveredFeatureState?.id ?? null}
            onHover={handleFeatureHover}
            onMove={handleFeatureMove}
            onLeave={handleFeatureLeave}
          />

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
                {p.landUse && (p.landUse === "mortgage" || p.landUse === "amenity") && (() => {
                  // Force-fit to the plot's own width AND height (in
                  // screen units, after convert()) rather than trusting a
                  // guessed font size / fixed pixel offset -- guarantees
                  // the label never spills past the plot boundary
                  // regardless of plot size or zoom level. A fixed +9px
                  // offset previously overlapped the bottom border on
                  // shorter rows (e.g. plots 103-105, ~30ft tall) even
                  // though it looked fine on a taller row (plot 106,
                  // ~39ft) -- scaling both the offset and font size to
                  // each plot's own height fixes that for every plot, not
                  // just the one that happened to be tall enough.
                  const screenPts = p.polygon.map((v) => convert(v));
                  const xs = screenPts.map((v) => v.x);
                  const ys = screenPts.map((v) => v.y);
                  const plotScreenWidth = Math.max(...xs) - Math.min(...xs);
                  const plotScreenHeight = Math.max(...ys) - Math.min(...ys);
                  const targetWidth = plotScreenWidth * 0.82;
                  const fontSize = Math.max(2.5, Math.min(5, plotScreenHeight * 0.16));
                  const yOffset = Math.min(plotScreenHeight * 0.26, plotScreenHeight / 2 - fontSize * 0.9);
                  return (
                    <text
                      x={convert(p.center).x}
                      y={convert(p.center).y + yOffset}
                      fontSize={fontSize}
                      fontWeight={800}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#1e3a8a"
                      textLength={targetWidth}
                      lengthAdjust="spacingAndGlyphs"
                      pointerEvents="none"
                    >
                      {p.landUse.toUpperCase()}
                    </text>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default DxfCanvas;
