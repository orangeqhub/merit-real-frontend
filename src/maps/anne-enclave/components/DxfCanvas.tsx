import React, { useMemo, useState, useRef, useEffect } from "react";
import { DXFDrawing, Point } from "../types/dxf";
import usePanZoom, { offsetForCenteredZoom } from "../hooks/usePanZoom";
import useKeyboard from "../hooks/useKeyboard";

import Toolbar from "./Viewer/Toolbar";
import SearchBox from "./Viewer/SearchBox";
import DigitizerPanel from "./Viewer/DigitizerPanel";

import LineLayer from "./Layers/LineLayer";
import PhaseBoundaryLayer from "./Layers/PhaseBoundaryLayer";
import RegionLayer, { RegionInfo } from "./Layers/RegionLayer";
import UtilitiesLayer from "./Layers/UtilitiesLayer";
import RoadLayer from "./Layers/RoadLayer";
import AddedRoadsLayer from "./Layers/AddedRoadsLayer";
import RoadMarkingsLayer from "./Layers/RoadMarkingsLayer";
import TreesLayer from "./Layers/TreesLayer";
import StreetLightsLayer from "./Layers/StreetLightsLayer";
import CarsLayer from "./Layers/CarsLayer";
import GISMap from "./Layers/GISMap";

import usePolygonDraw from "../hooks/usePolygonDraw";
import PlotNumberLayer, { PlotNumberEntry } from "./Layers/PlotNumberLayer";
import PlotLayer from "./Layers/PlotLayer";
import ImageUnderlayLayer from "./Layers/ImageUnderlayLayer";
import PropertyPopup from "./Popup/PropertyPopup";
import RegionTooltip from "./Viewer/RegionTooltip";
import PlotTooltip from "./Viewer/PlotTooltip";
import {
  STATUS_COLORS,
  TYPE_COLORS,
  type PlotInformation,
} from "../models/PlotInformation";
import {
  getPlotNumberMapping,
  type LayoutSpec,
} from "../layouts";
import {
  assignPlotPhases,
  filterPlotsByPhase,
  getLayoutPhaseCounts,
  parsePhaseParam,
  toDisplayPlotNumber,
  type PhaseFilter,
} from "../utils/plotPhases";
import { calculateArea } from "../utils/geometry/AreaCalculator";
import SnapEngine from "../utils/geometry/SnapEngine";
import {
  METERS_PER_WORLD_UNIT,
  worldToLatLng,
  metersPerPixelToZoom,
  type MapView,
} from "../utils/gis/geoTransform";
import { isDashEntity } from "../utils/dottedBlocks";
import { usePlotInfo } from "../context/PlotInfoContext";

const LIGHT_GREEN_PLOT_NUMBERS = new Set([75, 76, 77, 91, 92, 93, 94, 86, 51]);

/** Public series plot number + phase -- the identity this layout's rows use. */
export interface PlotSeriesIdentity {
  plotNo: string;
  phase: 1 | 2;
}

interface Props {
  drawing: DXFDrawing;
  layout: LayoutSpec;
  width?: number;
  height?: number;
  onPlotHit?: (hit: {
    plotNumber: number;
    polygon: Point[];
    area: number;
    status: string;
  }) => void;
  /** Additive: native (non-iframe) host hook for plot selection. */
  onSelectPlot?: (externalId: string | null, identity?: PlotSeriesIdentity) => void;
  /** Additive: native (non-iframe) host hook for the booking action. */
  onBookPlot?: (externalId: string, identity?: PlotSeriesIdentity) => void;
}

const DxfCanvas: React.FC<Props> = ({
  drawing,
  layout,
  width = window.innerWidth,
  height = window.innerHeight,
  onPlotHit,
  onSelectPlot,
  onBookPlot,
}) => {
  const { plotsById, getPlot, updatePlot: updatePlotInfo } = usePlotInfo();

  const layoutKey = layout.key;
  const hasPhases = layout.phases !== "none";

  const editMode = (() => {
    try {
      return new URLSearchParams(window.location.search).get("edit") === "1";
    } catch {
      return false;
    }
  })();

  const [phase, setPhase] = useState<PhaseFilter>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return parsePhaseParam(params.get("phase"), "all");
    } catch {
      return "all";
    }
  });

  /* -----------------------------
      Filter Entities
  ------------------------------ */

  const lineEntities = useMemo(
    () => drawing.entities.filter((e: any) => e.type === "LWPOLYLINE"),
    [drawing]
  );

  const visibleLineEntities = useMemo(
    () =>
      lineEntities.filter((e: any) => {
        if (isDashEntity(e)) return false;
        const color = e.colorIndex ?? e.color;
        return color !== 11 && color !== 30;
      }),
    [lineEntities]
  );

  // Each polygon's public series number (Phase 2 = Plan-8 number + 134) comes
  // from its assigned phase -- the same identity PlotInfoContext uses to merge
  // the backend rows -- so it is identical in every phase view and search,
  // Plot Board and booking all refer to the plot whose data is shown.
  const numberPlots = useMemo(() => {
    const mapping = getPlotNumberMapping() as unknown as PlotNumberEntry[];
    const assignedPhase = new Map(assignPlotPhases(mapping).map((p) => [p.id, p.phase]));
    return filterPlotsByPhase(mapping, phase).map((plot) => ({
      ...plot,
      displayPlotNumber: toDisplayPlotNumber(assignedPhase.get(plot.id) ?? plot.phase, plot.plotNumber),
    }));
  }, [phase]);

  const layoutPhaseCounts = useMemo(
    () =>
      getLayoutPhaseCounts(
        getPlotNumberMapping() as unknown as PlotNumberEntry[]
      ),
    []
  );

  const handlePhaseChange = (next: PhaseFilter) => {
    setPhase(next);
    setSelectedNumberPlotId(null);
    setHighlightedNumbers(new Set());
    try {
      const url = new URL(window.location.href);
      if (next === "all") url.searchParams.delete("phase");
      else url.searchParams.set("phase", String(next));
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: "merit-map-phase", phase: next },
          "*"
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event?.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "merit-map-set-phase") {
        const next = parsePhaseParam(data.phase, "all");
        setPhase((current) => {
          if (current === next) return current;
          setSelectedNumberPlotId(null);
          setHighlightedNumbers(new Set());
          return next;
        });
        return;
      }

      // Board -> map sync: the host board (or its search box) selected a
      // plot -- zoom to + highlight the same plot here. This handler never
      // posts a `merit-map-select` back (the parent already knows what it
      // just told us to select), so there is no echo to suppress.
      if (data.type === "merit-map-select-plot") {
        const externalId = String(data.externalId || "");
        const rawPlotNo = String(data.plotNo || "").replace(/\D/g, "");
        if (!externalId && !rawPlotNo) {
          setSelectedNumberPlotId(null);
          setHighlightedNumbers(new Set());
          return;
        }
        // Board plots carry the series number this map's data is merged by,
        // so match on it first (a board row's externalId is not a geometry id
        // for this layout).
        const target =
          (rawPlotNo && numberPlots.find((p) => String(p.displayPlotNumber ?? p.plotNumber) === rawPlotNo)) ||
          numberPlots.find(
            (p) =>
              externalId &&
              (p.id === externalId || `${parentExternalIdPrefix}${p.id}` === externalId)
          ) ||
          null;
        if (!target) return;
        latestFocus.current(target);
        setSelectedNumberPlotId(target.id);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [numberPlots]);

  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "merit-map-phase", phase }, "*");
      }
    } catch {
      // ignore
    }
  }, []);

  /* -----------------------------
      Layout Bounds (from linework only)
      Ignores text/mtext far outside the layout
  ------------------------------ */

  const layoutBounds = useMemo(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    lineEntities.forEach((entity: any) => {
      entity.vertices?.forEach((v: Point) => {
        if (v.x < minX) minX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.x > maxX) maxX = v.x;
        if (v.y > maxY) maxY = v.y;
      });
    });

    const fromLines =
      Number.isFinite(minX) &&
      Number.isFinite(maxX) &&
      maxX > minX &&
      maxY > minY;

    if (!fromLines) {
      for (const plot of getPlotNumberMapping() as unknown as PlotNumberEntry[]) {
        for (const v of plot.polygon || []) {
          if (v.x < minX) minX = v.x;
          if (v.y < minY) minY = v.y;
          if (v.x > maxX) maxX = v.x;
          if (v.y > maxY) maxY = v.y;
        }
      }
    }

    // Image-based layouts have no linework or plots: use the image box.
    if (!Number.isFinite(minX)) {
      const underlay = layout.imageUnderlay;
      if (underlay) {
        minX = underlay.box.minX;
        minY = underlay.box.minY;
        maxX = underlay.box.minX + underlay.box.width;
        maxY = underlay.box.minY + underlay.box.height;
      } else {
        minX = 0;
        minY = 0;
        maxX = 1;
        maxY = 1;
      }
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [lineEntities, layout.imageUnderlay]);

  /* -----------------------------
      Centered Fit (10% padding)
  ------------------------------ */

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
      y: height - ((p.y - layoutBounds.minY) * fitScale + offsetY),
    }),
    [layoutBounds, fitScale, offsetX, offsetY, height]
  );

  // Inverse of convert(): screen/group coordinates (as returned by the SVG
  // click handlers) back into layout world coordinates. Used by the digitizer
  // to export polygons into plotNumberMapping.json.
  const toWorld = useMemo(
    () => (p: Point) => ({
      x: layoutBounds.minX + (p.x - offsetX) / fitScale,
      y: layoutBounds.minY + (height - p.y - offsetY) / fitScale,
    }),
    [layoutBounds, fitScale, offsetX, offsetY, height]
  );

  /* -----------------------------
      State
  ------------------------------ */

  const [hoveredVertex, setHoveredVertex] = useState<{
    plotId: string;
    vertexIndex: number;
  } | null>(null);
  const [draggedVertex, setDraggedVertex] = useState<{
    plotId: string;
    vertexIndex: number;
  } | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const [selectedNumberPlotId, setSelectedNumberPlotId] = useState<string | null>(null);
  const [highlightedNumbers, setHighlightedNumbers] = useState<Set<number>>(new Set());
  const [searchNotFound, setSearchNotFound] = useState<string | null>(null);
  const [regionHover, setRegionHover] = useState<RegionInfo | null>(null);
  const [regionHoverPos, setRegionHoverPos] = useState({ x: 0, y: 0 });
  const [plotHover, setPlotHover] = useState<PlotInformation | null>(null);
  const [plotHoverPos, setPlotHoverPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const contentGroupRef = useRef<SVGGElement | null>(null);

  /* -----------------------------
      Zoom & Pan
  ------------------------------ */

  const {
    zoom,
    offset,
    onWheel,
    onMouseDown: onPanMouseDown,
    onMouseMove: onPanMouseMove,
    onMouseUp,
    resetView,
    zoomByFactor,
    setZoom,
    setOffset,
  } = usePanZoom(true, width, height, svgRef);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const z = zoomRef.current;
    if (z === 1) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    setOffset(offsetForCenteredZoom(z, width, height));
  }, [width, height, setOffset]);

  /* -----------------------------
      GIS Map View (background satellite)
  ------------------------------ */

  const mapView = useMemo<MapView>(() => {
    const anchorWorld = {
      x: (layoutBounds.minX + layoutBounds.maxX) / 2,
      y: (layoutBounds.minY + layoutBounds.maxY) / 2,
    };

    const centerWorldX =
      layoutBounds.minX +
      (width / 2 - offset.x) / zoom / fitScale -
      offsetX / fitScale;

    const centerWorldY =
      layoutBounds.minY +
      (height - (height / 2 - offset.y) / zoom - offsetY) / fitScale;

    const { lat, lng } = worldToLatLng(centerWorldX, centerWorldY, anchorWorld);

    const metersPerPx = METERS_PER_WORLD_UNIT / (fitScale * zoom);
    const zoomLevel = metersPerPixelToZoom(metersPerPx, lat);

    return {
      center: [lat, lng],
      zoom: Math.min(21, Math.max(2, zoomLevel)),
    };
  }, [
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

  /* -----------------------------
      Polygon Drawing
  ------------------------------ */

  const {
    plots,
    currentPoints,
    selectedPlotId,
    isDrawing,

    startDrawing,
    cancelDrawing,
    addPoint,
    updateLastPoint,
    finishDrawing,
    selectPlot,
    deletePlot,
    updatePlots,
    updatePlot,
    clearPlots,
    undo,
    redo,
  } = usePolygonDraw();

  const getSvgPoint = (e: React.MouseEvent<SVGSVGElement> | React.MouseEvent<SVGCircleElement>) => {
    const svg = svgRef.current;
    const group = contentGroupRef.current;

    if (!svg || !group) {
      return { x: 0, y: 0 };
    }

    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;

    const cursor = point.matrixTransform(group.getScreenCTM()?.inverse());

    return {
      x: cursor.x,
      y: cursor.y,
    };
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedVertex) return;

    if (!isDrawing) {
      selectPlot(null);
      setSelectedNumberPlotId(null);
      return;
    }

    const targetPoint = getSvgPoint(e);
    const snapped = SnapEngine.findNearestPoint(currentPoints.slice(0, -1), targetPoint, 10);

    addPoint(snapped ?? targetPoint);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;

    const targetPoint = getSvgPoint(e);
    const snapped = SnapEngine.findNearestPoint(currentPoints.slice(0, -1), targetPoint, 10);

    const pointToUse = snapped ?? targetPoint;
    setSnapPoint(snapped ? { x: pointToUse.x, y: pointToUse.y } : null);
    updateLastPoint(pointToUse);
  };

  const handleVertexMouseDown = (plotId: string, index: number, e: React.MouseEvent<SVGCircleElement>) => {
    e.stopPropagation();
    setDraggedVertex({ plotId, vertexIndex: index });
    selectPlot(plotId);
  };

  const handleVertexMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedVertex) return;

    const nextPoint = getSvgPoint(e);
    const nextPlots = plots.map((plot) => {
      if (plot.id !== draggedVertex.plotId) return plot;

      const nextPolygon = [...plot.polygon];
      nextPolygon[draggedVertex.vertexIndex] = nextPoint;
      return { ...plot, polygon: nextPolygon };
    });

    const updatedPlots = nextPlots.map((plot) => ({
      ...plot,
      area: calculateArea(plot.polygon),
    }));

    updatePlots(updatedPlots);
  };

  const handleVertexMouseUp = () => {
    setDraggedVertex(null);
  };

  const selectedNumberEntry =
    numberPlots.find((plot) => plot.id === selectedNumberPlotId) ?? null;

  // The number shown on the block (PlotNumberLayer label) is the source of
  // truth: hover card and details card always display it, even if stored or
  // API records carry a different plotNo.
  const withMapLabel = (
    info: PlotInformation | null | undefined,
    entry: PlotNumberEntry | null
  ): PlotInformation | null => {
    if (!info) return null;
    if (!entry) return info;
    return { ...info, plotNo: String(entry.plotNumber) };
  };

  const popupPlot: PlotInformation | null = withMapLabel(
    selectedNumberPlotId ? getPlot(selectedNumberPlotId) : null,
    selectedNumberEntry
  );

  // Fill follows the plot's live backend status (/map/plots, merged in
  // PlotInfoContext); plots without a status keep the "available" green.
  const fillColor = (plotId: string) => {
    const status = String(getPlot(plotId)?.status || "").toLowerCase() as PlotInformation["status"];
    return STATUS_COLORS[status] || STATUS_COLORS.available;
  };

  // This layout's backend rows are matched to polygons by series plot number
  // (see plotInfoService's merge), not by geometry id, so the host board and
  // booking must be told that same identity.
  const seriesIdentity = (target: { displayPlotNumber?: number; plotNumber: number }) => {
    const plotNo = String(target.displayPlotNumber ?? target.plotNumber);
    return { plotNo, phase: (Number(plotNo) > 134 ? 2 : 1) as 1 | 2 };
  };

  // Backend externalId prefix for layouts whose raw source ids are not
  // globally unique (scripts/seedMapPlots.js prefixes exactly these), so the
  // parent board can reliably match this MapPlots row by externalId.
  const parentExternalIdPrefix = layoutKey === "sri-lakshmi" ? "sl-" : "";

  // Map -> board sync: a plot selected directly on the map (click or the
  // map's own search box) must highlight the same tile + details on the
  // host board. Board-initiated selections (merit-map-select-plot) never
  // call this function, so there is no echo to suppress here.
  const sendSelectToParent = (
    target: PlotNumberEntry & { displayPlotNumber?: number }
  ) => {
    onSelectPlot?.(`${parentExternalIdPrefix}${target.id}`, seriesIdentity(target));
    if (!(window.parent && window.parent !== window)) return;
    try {
      window.parent.postMessage(
        {
          type: "merit-map-select",
          externalId: `${parentExternalIdPrefix}${target.id}`,
          plotNo: String(target.displayPlotNumber ?? target.plotNumber),
        },
        "*"
      );
    } catch {
      // ignore cross-origin / not embedded
    }
  };

  // Re-centre + zoom the canvas onto one plot and highlight its number.
  // Shared by the map's own search box and by host-initiated selections so
  // both entry points always end up on exactly the same view.
  const focusPlotOnCanvas = (
    target: PlotNumberEntry & { displayPlotNumber?: number }
  ) => {
    const plotNum = target.plotNumber;
    setHighlightedNumbers(new Set([plotNum]));

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    target.polygon.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const center = convert({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });

    const targetZoom = Math.min(
      20,
      Math.max(0.8, (Math.min(width, height) * 0.6) / (Math.max(bboxW, bboxH) * fitScale))
    );

    setZoom(targetZoom);
    setOffset({
      x: width / 2 - center.x * targetZoom,
      y: height / 2 - center.y * targetZoom,
    });
  };

  // The board -> map message handler is registered once per phase view, so it
  // calls the latest render's focus function (current width/height/convert)
  // instead of the one captured when it was registered.
  const latestFocus = useRef(focusPlotOnCanvas);
  latestFocus.current = focusPlotOnCanvas;

  const handleNumberPlotClick = (plot: PlotNumberEntry) => {
    setSelectedNumberPlotId(plot.id);
    onPlotHit?.({
      plotNumber: plot.displayPlotNumber ?? plot.plotNumber,
      polygon: plot.polygon,
      area: plot.area,
      status: plot.status || "available",
    });
    sendSelectToParent(plot);
  };

  const handleRegionHover = (
    region: RegionInfo | null,
    clientX: number,
    clientY: number
  ) => {
    setRegionHover(region);
    setRegionHoverPos({ x: clientX, y: clientY });
  };

  const handlePlotHover = (
    plot: PlotNumberEntry | null,
    clientX: number,
    clientY: number
  ) => {
    setPlotHover(
      withMapLabel(plot ? getPlot(plot.id) : null, plot ?? null)
    );
    setPlotHoverPos({ x: clientX, y: clientY });
  };

  const handleCrossLineHover = (
    plotId: string | null,
    clientX: number,
    clientY: number
  ) => {
    const entry = plotId
      ? numberPlots.find((p) => p.id === plotId) ?? null
      : null;
    setPlotHover(withMapLabel(plotId ? getPlot(plotId) : null, entry));
    setPlotHoverPos({ x: clientX, y: clientY });
  };

  const zoomToPlotQuery = (rawQuery: string) => {
    const query = String(rawQuery || "").replace(/\D/g, "");
    if (!query) {
      setHighlightedNumbers(new Set());
      setSearchNotFound(null);
      return;
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "merit-map-search", query }, "*");
    }

    // Exact matches only (never a prefix: "1" must not land on 10/11/101).
    // The public series number wins (Anne Phase 2 = 135-272, what the Plot
    // Board and API use); the number printed on the block is the fallback,
    // both limited to the phase currently shown.
    const target =
      numberPlots.find((p) => String(p.displayPlotNumber ?? p.plotNumber) === query) ||
      numberPlots.find((p) => String(p.plotNumber) === query) ||
      null;
    if (!target) {
      setSearchNotFound(query);
      return;
    }
    setSearchNotFound(null);

    focusPlotOnCanvas(target);
    setSelectedNumberPlotId(target.id);
    sendSelectToParent(target);
  };

  const handleDelete = () => {
    if (selectedPlotId) {
      deletePlot(selectedPlotId);
      return;
    }

    if (selectedNumberPlotId) {
      setSelectedNumberPlotId(null);
    }
  };

  const handlePopupChange = (patch: Partial<PlotInformation>) => {
    if (!selectedNumberPlotId) return;
    updatePlotInfo(selectedNumberPlotId, patch);
  };

  useKeyboard(
    editMode
      ? {
          onDelete: handleDelete,
          onEscape: cancelDrawing,
          onEnter: finishDrawing,
          onUndo: undo,
          onRedo: redo,
        }
      : {}
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
      {layout.gisEnabled && <GISMap width={width} height={height} view={mapView} />}

      <Toolbar
        onZoomIn={() => zoomByFactor(1.2)}
        onZoomOut={() => zoomByFactor(1 / 1.2)}
        resetView={resetView}
        phase={phase}
        onPhaseChange={hasPhases ? handlePhaseChange : undefined}
        phaseCounts={hasPhases ? layoutPhaseCounts : undefined}
      />

      <SearchBox
        onSearch={zoomToPlotQuery}
        onClear={() => {
          setHighlightedNumbers(new Set());
          setSearchNotFound(null);
        }}
        notFound={searchNotFound}
      />

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (!isDrawing) onPanMouseDown(e);
        }}
        onMouseMove={(e) => {
          onPanMouseMove(e);
          handleSvgMouseMove(e);
          if (draggedVertex) {
            handleVertexMouseMove(e);
          }
        }}
        onMouseUp={() => {
          onMouseUp();
          handleVertexMouseUp();
        }}
        onMouseLeave={() => {
          onMouseUp();
          handleVertexMouseUp();
        }}
        onClick={handleSvgClick}
        onDoubleClick={finishDrawing}
        style={{
          background: "transparent",
          cursor: "default",
          display: "block",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          touchAction: "none",
        }}
      >
        <g
          ref={contentGroupRef}
          transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}
        >
          {/* Image underlay for image-based layouts (behind everything) */}

          {layout.imageUnderlay && (
            <ImageUnderlayLayer
              convert={convert}
              scale={fitScale}
              box={layout.imageUnderlay.box}
              src={layout.imageUnderlay.src}
            />
          )}

          {/* Roads (black fills, at the back) */}

          <RoadLayer
            convert={convert}
            onRegionHover={handleRegionHover}
            onCrossLineHover={handleCrossLineHover}
          />

          {/* Added road strips between plot columns (render-only) */}

          <AddedRoadsLayer convert={convert} />

          {/* Road markings (dashed center lines, above roads / below plots) */}

          <RoadMarkingsLayer convert={convert} scale={fitScale} zoom={zoom} />

          {/* Region Fills (plots / open spaces, above roads) */}

          <RegionLayer
            convert={convert}
            scale={fitScale}
            zoom={zoom}
            mode="fills"
            phase={phase}
            onRegionHover={handleRegionHover}
          />

          {/* Utilities (above roads) */}

          <UtilitiesLayer
            convert={convert}
            onRegionHover={handleRegionHover}
          />

          {/* Linework (black walls) */}

          <LineLayer
            entities={visibleLineEntities}
            convert={convert}
          />

          {/* Landscaping: trees in open spaces / roadside gaps */}

          <TreesLayer convert={convert} scale={fitScale} zoom={zoom} />

          {/* Street lights along road edges */}

          <StreetLightsLayer convert={convert} scale={fitScale} zoom={zoom} />

          {/* Animated cars on road center lines */}

          <CarsLayer convert={convert} scale={fitScale} zoom={zoom} />

          {/* Plot Numbers Layer (above decorations) */}

          <PlotNumberLayer
            plots={numberPlots}
            convert={convert}
            scale={fitScale}
            zoom={zoom}
            selectedId={selectedNumberPlotId}
            highlighted={highlightedNumbers}
            fillColor={fillColor}
            onPlotClick={handleNumberPlotClick}
            onPlotHover={handlePlotHover}
          />

          {layout.phaseBoundaries && <PhaseBoundaryLayer convert={convert} />}

          {/* GIS Layer */}
          {/* PlotLayer is an editing-only overlay (Digitizer / ?edit=1). It is
              kept out of normal viewers so browser-persisted dev sketches never
              leak into production embeds. */}

          {editMode && (
            <PlotLayer
              plots={plots}
              currentPoints={currentPoints}
              selectedPlotId={selectedPlotId}
              hoveredVertex={hoveredVertex}
              onSelectPlot={selectPlot}
              onVertexMouseDown={handleVertexMouseDown}
              onVertexHover={(plotId: string, vertexIndex: number) => setHoveredVertex({ plotId, vertexIndex })}
              onVertexLeave={() => setHoveredVertex(null)}
            />
          )}
        </g>

        {snapPoint && (
          <circle
            cx={snapPoint.x}
            cy={snapPoint.y}
            r={6}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
          />
        )}
      </svg>

      <RegionTooltip
        region={regionHover}
        x={regionHoverPos.x}
        y={regionHoverPos.y}
      />

      <PlotTooltip
        plot={plotHover}
        x={plotHoverPos.x}
        y={plotHoverPos.y}
      />

      {editMode && (
        <DigitizerPanel
          layoutName={layout.name}
          isDrawing={isDrawing}
          plots={plots}
          currentPoints={currentPoints}
          selectedPlotId={selectedPlotId}
          onStartDrawing={startDrawing}
          onCancelDrawing={cancelDrawing}
          onFinishDrawing={finishDrawing}
          onSelectPlot={selectPlot}
          onDeletePlot={deletePlot}
          onClearPlots={clearPlots}
          onUpdatePlot={updatePlot}
          toWorld={toWorld}
        />
      )}

      <PropertyPopup
        plot={popupPlot}
        onChange={handlePopupChange}
        onClose={() => setSelectedNumberPlotId(null)}
        onBook={(plot) => {
          if (onBookPlot) {
            onBookPlot(plot.id, selectedNumberEntry ? seriesIdentity(selectedNumberEntry) : undefined);
            return;
          }
          const payload = {
            type: "merit-map-book",
            externalId: plot.id,
            plotNo: plot.plotNo,
          };
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, "*");
            return;
          }
          const appBase = String(
            import.meta.env.VITE_MERIT_APP_URL || "http://187.127.163.100:3700"
            // || "http://localhost:3000"
          ).replace(/\/$/, "");
          window.location.href = `${appBase}/book-plot/${encodeURIComponent(plot.id)}`;
        }}
      />
    </div>
  );
};

export default DxfCanvas;
