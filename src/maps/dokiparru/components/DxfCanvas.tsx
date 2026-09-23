import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import type { Point } from "../types/dxf";
import {
  getPlotNumberMapping,
  getImageUnderlay,
  getRoads,
  getExistingRoads,
} from "../layouts";
import usePanZoom from "../hooks/usePanZoom";
import {
  useLayoutPlotData,
  plotFillColor,
  STATUS_LABELS,
} from "../hooks/useLayoutPlotData";
import RoadLayer from "./layers/RoadLayer";
import RegionLayer from "./layers/RegionLayer";
import GISMap from "./layers/GISMap";
import MapLegend from "./MapLegend";
import PlotTooltip from "./PlotTooltip";
import {
  worldToLatLng,
  metersPerPixelToZoom,
  resolveAnchor,
  getEffectiveTransformMode,
  DRAWING_SCALE_METERS_PER_WORLD_UNIT,
  GIS_VISUAL_SIZE_FACTOR,
  type MapView,
} from "../utils/gis/geoTransform";

interface Props {
  width: number;
  height: number;
  onSelectPlot?: (externalId: string | null) => void;
  onBookPlot?: (externalId: string) => void;
}

const DxfCanvas: FC<Props> = ({ width, height, onSelectPlot, onBookPlot }) => {
  const plots = useMemo(() => getPlotNumberMapping(), []);

  // Live per-layout plot data from /map/plots?layout=dokiparru.
  // This is the same backend source of truth used by the main website.
  // Data refreshes when the host broadcasts merit-map-data-updated.
  const { rows: liveByPlotNo } = useLayoutPlotData("dokiparru");

  const liveFor = (p: { plotNumber: number }) =>
    liveByPlotNo[String(p.plotNumber)] ?? null;

  // Board -> map sync guard.
  const selectedFromParent = useRef(false);

  // Map -> board sync.
  const sendSelectToParent = (plot: {
    id: string;
    plotNumber: number | string;
  }) => {
    if (selectedFromParent.current) {
      selectedFromParent.current = false;
      return;
    }

    if (!(window.parent && window.parent !== window)) return;

    try {
      window.parent.postMessage(
        {
          type: "merit-map-select",

          // Must match backend MapPlot externalId.
          externalId: `dk-${plot.id}`,

          // Exact number printed on the map.
          plotNo: String(plot.plotNumber),
        },
        "*"
      );
    } catch {
      // Ignore cross-origin / not embedded errors.
    }

    onSelectPlot?.(`dk-${plot.id}`);
  };

  // Report this layout's verified plot list to the parent frontend.
  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        const plotNumbers = [
          ...new Set(plots.map((p) => Number(p.plotNumber))),
        ].sort((a, b) => a - b);

        window.parent.postMessage(
          {
            type: "merit-map-plot-count",
            count: plotNumbers.length,
            plotNumbers,
          },
          "*"
        );
      }
    } catch {
      // Ignore cross-origin errors.
    }
  }, [plots]);

  // Board -> map sync.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event?.data;

      if (
        !data ||
        typeof data !== "object" ||
        data.type !== "merit-map-select-plot"
      ) {
        return;
      }

      const externalId = String(data.externalId || "");
      const rawPlotNo = String(data.plotNo || "").replace(/\D/g, "");

      if (!externalId && !rawPlotNo) {
        setSelectedId(null);
        return;
      }

      const byId = externalId
        ? plots.find(
            (p) =>
              p.id === externalId ||
              `dk-${p.id}` === externalId
          )
        : undefined;

      const byNumber = rawPlotNo
        ? plots.find((p) => {
            const n = Number(p.plotNumber);

            return (
              String(p.plotNumber) === rawPlotNo ||
              (Number.isFinite(n) && n === Number(rawPlotNo))
            );
          })
        : undefined;

      const target = byId || byNumber || null;

      if (!target) return;

      selectedFromParent.current = true;

      zoomToPlot(Number(target.plotNumber));
    }

    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [plots]);

  const roads = useMemo(() => getRoads(), []);
  const existingRoads = useMemo(() => getExistingRoads(), []);
  const underlay = useMemo(() => getImageUnderlay(), []);

  const showUnderlay = false;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({
    x: 0,
    y: 0,
  });

  const [featureHover, setFeatureHover] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const svgRef = useRef<SVGSVGElement | null>(null);

  const {
    zoom,
    offset,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    zoomByFactor,
    setZoom,
    setOffset,
  } = usePanZoom(true, width, height);

  const layoutBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const extend = (pts: Point[]) => {
      for (const v of pts) {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      }
    };

    for (const p of plots) {
      extend(p.polygon);
    }

    // Include roads in layout bounds.
    for (const r of roads) {
      extend(r.polygon);
    }

    for (const r of existingRoads) {
      extend(r.polygon);
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [plots, roads, existingRoads]);

  const padX = width * 0.05;
  const padY = height * 0.05;

  const fitScale = useMemo(() => {
    if (!layoutBounds.width || !layoutBounds.height) {
      return 1;
    }

    return Math.min(
      (width - padX * 2) / layoutBounds.width,
      (height - padY * 2) / layoutBounds.height
    );
  }, [
    width,
    height,
    padX,
    padY,
    layoutBounds.width,
    layoutBounds.height,
  ]);

  const offsetX =
    (width - layoutBounds.width * fitScale) / 2;

  const offsetY =
    (height - layoutBounds.height * fitScale) / 2;

  // Image-pixel-derived coordinates.
  // Y already increases downward, matching screen convention.
  const convert = useMemo(
    () => (p: Point) => ({
      x:
        (p.x - layoutBounds.minX) * fitScale +
        offsetX,

      y:
        (p.y - layoutBounds.minY) * fitScale +
        offsetY,
    }),
    [
      layoutBounds,
      fitScale,
      offsetX,
      offsetY,
    ]
  );

  // GIS activation guard.
  const transformMode = getEffectiveTransformMode();
  const gisActive = transformMode !== "disabled";

  // GIS map view.
  const mapView = useMemo<MapView | null>(() => {
    if (!gisActive) {
      return null;
    }

    const resolved = resolveAnchor();

    const anchorWorld = resolved
      ? {
          x: resolved.worldX,
          y: resolved.worldY,
        }
      : {
          x:
            (layoutBounds.minX +
              layoutBounds.maxX) /
            2,

          y:
            (layoutBounds.minY +
              layoutBounds.maxY) /
            2,
        };

    const centerWorldX =
      layoutBounds.minX +
      (width / 2 - offset.x) /
        zoom /
        fitScale -
      offsetX / fitScale;

    const centerWorldY =
      layoutBounds.minY +
      (height -
        (height / 2 - offset.y) /
          zoom -
        offsetY) /
        fitScale;

    const result = worldToLatLng(
      centerWorldX,
      centerWorldY,
      anchorWorld
    );

    if (!result) {
      return null;
    }

    const metersPerPx =
      DRAWING_SCALE_METERS_PER_WORLD_UNIT /
      (fitScale * zoom) /
      GIS_VISUAL_SIZE_FACTOR;

    const zoomLevel = metersPerPixelToZoom(
      metersPerPx,
      result.lat
    );

    return {
      center: [result.lat, result.lng],

      zoom: Math.min(
        21,
        Math.max(2, zoomLevel)
      ),
    };
  }, [
    gisActive,
    layoutBounds,
    width,
    height,
    offset.x,
    offset.y,
    zoom,
    fitScale,
    offsetX,
    offsetY,
  ]);

  const fitToLayout = () => {
    setZoom(1);
    setOffset({
      x: 0,
      y: 0,
    });
  };

  const zoomToPlot = (plotNumber: number) => {
    const plot = plots.find(
      (p) => p.plotNumber === plotNumber
    );

    if (!plot) {
      return;
    }

    setSelectedId(plot.id);

    const cx = convert(plot.center).x;
    const cy = convert(plot.center).y;

    const targetZoom = 6;

    setZoom(targetZoom);

    setOffset({
      x:
        width / 2 -
        cx * targetZoom,

      y:
        height / 2 -
        cy * targetZoom,
    });

    sendSelectToParent(plot);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();

    const n = Number(query.trim());

    if (!Number.isFinite(n)) {
      return;
    }

    try {
      if (
        window.parent &&
        window.parent !== window
      ) {
        window.parent.postMessage(
          {
            type: "merit-map-search",
            query: String(n),
          },
          "*"
        );
      }
    } catch {
      // Ignore cross-origin errors.
    }

    zoomToPlot(n);
  };

  const selectedPlot = plots.find(
    (p) => p.id === selectedId
  );

  const hoveredPlot = plots.find(
    (p) => p.id === hoveredId
  );

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
      {gisActive && mapView && (
        <GISMap
          width={width}
          height={height}
          view={mapView}
        />
      )}

      <MapLegend />

      {hoveredPlot && (
        <PlotTooltip
          plot={{
            plotNumber:
              hoveredPlot.plotNumber,

            areaSqYd:
              hoveredPlot.areaSqYd,

            status:
              liveFor(hoveredPlot)?.status ??
              null,

            facing:
              liveFor(hoveredPlot)?.facing ??
              null,

            ratePerSqYd:
              liveFor(hoveredPlot)
                ?.ratePerSqYd ?? null,

            plotCost:
              liveFor(hoveredPlot)?.plotCost ??
              null,

            customerName:
              liveFor(hoveredPlot)
                ?.customerName ?? null,
          }}
          x={hoverPos.x}
          y={hoverPos.y}
        />
      )}

      {featureHover && !hoveredPlot && (
        <div
          style={{
            position: "fixed",
            left:
              featureHover.x + 14,
            top:
              featureHover.y + 14,
            zIndex: 1001,
            background:
              "rgba(17, 24, 39, 0.92)",
            border:
              "1px solid rgba(255,255,255,0.3)",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {featureHover.label}
        </div>
      )}

      <style>{`
        .dokiparru-toolbar-btn {
          transition:
            background-color 0.12s ease,
            border-color 0.12s ease,
            filter 0.12s ease;
          cursor: pointer;
        }

        .dokiparru-toolbar-btn:hover {
          filter: brightness(1.15);
          background-color: rgba(59, 130, 246, 0.85);
          color: #fff;
        }

        .dokiparru-toolbar-btn:active {
          filter: brightness(0.95);
        }

        .dokiparru-search-input {
          transition:
            border-color 0.12s ease,
            box-shadow 0.12s ease;
        }

        .dokiparru-search-input:hover {
          border-color:
            rgba(59, 130, 246, 0.4);
        }

        .dokiparru-search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow:
            0 0 0 2px
            rgba(59, 130, 246, 0.35);
        }
      `}</style>

      {/* Toolbar */}
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex flex-col items-center gap-2">
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
          <button
            type="button"
            aria-label="Zoom in"
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            onClick={() =>
              zoomByFactor(1.2)
            }
          >
            +
          </button>

          <div className="h-px w-full bg-gray-200" />

          <button
            type="button"
            aria-label="Zoom out"
            className="flex h-10 w-10 items-center justify-center text-lg font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            onClick={() =>
              zoomByFactor(1 / 1.2)
            }
          >
            −
          </button>
        </div>

        <button
          type="button"
          aria-label="Reset view"
          title="Fit to view"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-md hover:bg-gray-50 active:bg-gray-100"
          onClick={fitToLayout}
        >
          <Crosshair size={18} />
        </button>
      </div>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        style={{
          position: "absolute",
          top: 12,
          right: 68,
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <input
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          placeholder="Search Plot..."
          className="dokiparru-search-input"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border:
              "1px solid transparent",
            width: 220,
            pointerEvents: "auto",
          }}
        />
      </form>

      {/* =========================================================
          LIVE PLOT DETAILS CARD
          ========================================================= */}

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
            minWidth: 220,
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.35)",
          }}
        >
          {(() => {
            const p =
              selectedPlot ?? hoveredPlot!;

            /*
             * IMPORTANT:
             *
             * Static geometry supplies:
             * - plot number
             * - polygon
             * - center
             *
             * Backend MapPlot supplies:
             * - area
             * - type
             * - facing
             * - status
             * - rate
             * - total cost
             * - customer
             */

            const info = liveFor(p);

            /*
             * AREA
             *
             * Prefer backend area because this is the
             * live database value. Fall back to the
             * geometry mapping only if backend data is
             * temporarily unavailable.
             */
            const area =
              info?.plotArea != null &&
              Number.isFinite(
                Number(info.plotArea)
              )
                ? Number(info.plotArea)
                : p.areaSqYd != null
                  ? Number(p.areaSqYd)
                  : null;

            /*
             * TYPE
             */
            const plotType =
              info?.plotType != null &&
              String(info.plotType).trim() !== ""
                ? String(info.plotType)
                : "residential";

            const formattedType =
              plotType
                ? plotType
                    .charAt(0)
                    .toUpperCase() +
                  plotType.slice(1)
                : "—";

            /*
             * FACING
             */
            const facing =
              info?.facing != null &&
              String(info.facing).trim() !== ""
                ? String(info.facing)
                : null;

            /*
             * STATUS
             */
            const status =
              info?.status != null &&
              String(info.status).trim() !== ""
                ? String(info.status).toLowerCase()
                : null;

            const statusLabel = status
              ? STATUS_LABELS[status] ||
                status
                  .charAt(0)
                  .toUpperCase() +
                  status.slice(1)
              : null;

            /*
             * RATE
             */
            const rate =
              info?.ratePerSqYd != null &&
              Number.isFinite(
                Number(info.ratePerSqYd)
              )
                ? Number(info.ratePerSqYd)
                : null;

            /*
             * TOTAL COST
             *
             * First use database plotCost.
             * If plotCost is empty but Area + Rate
             * are available, calculate it.
             */
            const importedTotal =
              info?.plotCost != null &&
              Number.isFinite(
                Number(info.plotCost)
              )
                ? Number(info.plotCost)
                : null;

            const calculatedTotal =
              importedTotal == null &&
              area != null &&
              rate != null
                ? Math.round(
                    area * rate * 100
                  ) / 100
                : importedTotal;

            /*
             * CUSTOMER
             */
            const customerName =
              info?.customerName != null &&
              String(
                info.customerName
              ).trim() !== ""
                ? String(
                    info.customerName
                  )
                : null;

            /*
             * BOOKING
             */
            const isAvailable =
              !status ||
              status === "available";

            return (
              <>
                {/* Plot Number */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 7,
                  }}
                >
                  Plot {p.plotNumber}
                </div>

                {/* Area */}
                <div>
                  Area:{" "}
                  {area != null &&
                  Number.isFinite(area)
                    ? `${area.toFixed(
                        2
                      )} Sq.Yds`
                    : "—"}
                </div>

                {/* Type */}
                <div>
                  Type: {formattedType}
                </div>

                {/* Facing */}
                <div
                  style={{
                    color: "#d1d5db",
                    marginTop: 2,
                  }}
                >
                  Facing:{" "}
                  {facing || "—"}
                </div>

                {/* Status */}
                <div
                  style={{
                    color: "#d1d5db",
                  }}
                >
                  Status:{" "}
                  {statusLabel || "—"}
                </div>

                {/* Rate */}
                <div
                  style={{
                    color: "#d1d5db",
                  }}
                >
                  Rate/Sq.Yd:{" "}
                  {rate != null &&
                  rate > 0
                    ? `₹${rate.toLocaleString(
                        "en-IN"
                      )}`
                    : "—"}
                </div>

                {/* Total Cost */}
                <div
                  style={{
                    color: "#d1d5db",
                  }}
                >
                  Total Cost:{" "}
                  {calculatedTotal != null &&
                  calculatedTotal > 0
                    ? `₹${Number(
                        calculatedTotal
                      ).toLocaleString(
                        "en-IN"
                      )}`
                    : "—"}
                </div>

                {/* Customer */}
                {customerName && (
                  <div
                    style={{
                      color: "#d1d5db",
                    }}
                  >
                    Customer:{" "}
                    {customerName}
                  </div>
                )}

                {/* Book Button */}
                {selectedPlot &&
                  isAvailable && (
                    <button
                      className="dokiparru-toolbar-btn"
                      onClick={() => {
                        try {
                          window.parent?.postMessage(
                            {
                              type: "merit-map-book",

                              // Must match seeded
                              // backend MapPlot.
                              externalId: `dk-${selectedPlot.id}`,

                              // Exact plot number.
                              plotNo:
                                String(
                                  selectedPlot.plotNumber
                                ),
                            },
                            "*"
                          );
                        } catch {
                          // Ignore cross-origin
                          // / not embedded.
                        }

                        onBookPlot?.(
                          `dk-${selectedPlot.id}`
                        );
                      }}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        background:
                          "#1d4ed8",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding:
                          "8px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor:
                          "pointer",
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

      {/* =========================================================
          MAP SVG
          ========================================================= */}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          background: "transparent",
          display: "block",
          touchAction: "none",

          // Keep SVG above GIS background.
          position: "relative",
          zIndex: 1,
        }}
      >
        <g
          transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}
        >
          {/* Optional image underlay */}
          {showUnderlay && (
            <image
              href={underlay.src}
              x={
                convert({
                  x: underlay.box.minX,
                  y: underlay.box.minY,
                }).x
              }
              y={
                convert({
                  x: underlay.box.minX,
                  y: underlay.box.minY,
                }).y
              }
              width={
                underlay.box.width *
                fitScale
              }
              height={
                underlay.box.height *
                fitScale
              }
              opacity={0.5}
              preserveAspectRatio="none"
            />
          )}

          {/* Regions */}
          <RegionLayer
            convert={convert}
            onHover={setFeatureHover}
          />

          {/* Roads */}
          <RoadLayer
            convert={convert}
            onHover={setFeatureHover}
          />

          {/* Plots */}
          {plots.map((p) => {
            const pts = p.polygon
              .map((v) => convert(v))
              .map(
                (v) =>
                  `${v.x},${v.y}`
              )
              .join(" ");

            const isSelected =
              p.id === selectedId;

            const isHovered =
              p.id === hoveredId;

            return (
              <g key={p.id}>
                <polygon
                  points={pts}
                  fill={plotFillColor(
                    liveFor(p)
                  )}
                  fillOpacity={
                    isSelected ||
                    isHovered
                      ? 1
                      : 0.88
                  }
                  stroke={
                    isSelected
                      ? "#0891b2"
                      : isHovered
                        ? "#fbbf24"
                        : "#1f2937"
                  }
                  strokeWidth={
                    isSelected
                      ? 2
                      : isHovered
                        ? 1.5
                        : 1
                  }
                  cursor="pointer"
                  onMouseEnter={(e) => {
                    setHoveredId(p.id);

                    setHoverPos({
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onMouseMove={(e) => {
                    setHoverPos({
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredId(
                      (cur) =>
                        cur === p.id
                          ? null
                          : cur
                    );
                  }}
                  onClick={() => {
                    setSelectedId(p.id);
                    sendSelectToParent(
                      p
                    );
                  }}
                />

                {/* Plot number */}
                <text
                  x={
                    convert(
                      p.center
                    ).x
                  }
                  y={
                    convert(
                      p.center
                    ).y
                  }
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