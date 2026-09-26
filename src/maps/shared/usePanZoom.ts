import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject, type SetStateAction } from "react";

/**
 * Pan/zoom state for the SVG-based native maps (Anne Enclave, Sri Lakshmi,
 * Dokiparru, Vinfra, Mandira). The layout group is drawn with
 * `translate(offset) scale(zoom)`, so every zoom must be applied AROUND a
 * screen point (viewport centre for the +/- buttons, the cursor for the
 * wheel, the pinch midpoint for touch) -- scaling alone would zoom about the
 * SVG's top-left corner and slide the layout off-screen, and resetting the
 * offset would throw away the user's pan / searched plot.
 */

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 20;

type Offset = { x: number; y: number };

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** Keep the layout center pinned to the viewport center at any zoom level. */
export function offsetForCenteredZoom(zoom: number, viewportWidth: number, viewportHeight: number) {
  return {
    x: (viewportWidth / 2) * (1 - zoom),
    y: (viewportHeight / 2) * (1 - zoom),
  };
}

export default function usePanZoom(
  allowPan = false,
  viewportWidth = 0,
  viewportHeight = 0,
  svgRef?: RefObject<SVGSVGElement | null>
) {
  const [zoom, setZoomState] = useState(1);
  const [offset, setOffsetState] = useState<Offset>({ x: 0, y: 0 });

  // Latest committed view, so consecutive zoom steps (and wheel/touch events
  // firing faster than React renders) always build on the real current view.
  const view = useRef({ zoom: 1, offset: { x: 0, y: 0 } as Offset });
  const viewport = useRef({ width: viewportWidth, height: viewportHeight });
  viewport.current = { width: viewportWidth, height: viewportHeight };

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // All setters below only touch refs + React state setters, so they are
  // stable across renders (callers list setOffset in effect dependencies --
  // a new function every render would re-run those effects forever).
  const setZoom = useCallback((next: SetStateAction<number>) => {
    const value = clampZoom(typeof next === "function" ? next(view.current.zoom) : next);
    view.current = { ...view.current, zoom: value };
    setZoomState(value);
  }, []);

  const setOffset = useCallback((next: SetStateAction<Offset>) => {
    const value = typeof next === "function" ? next(view.current.offset) : next;
    view.current = { ...view.current, offset: value };
    setOffsetState(value);
  }, []);

  /** Zoom by `factor` keeping screen point (px, py) fixed under the cursor. */
  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const { zoom: current, offset: o } = view.current;
    const next = clampZoom(current * factor);
    if (next === current) return;
    const k = next / current;
    setZoom(next);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, [setZoom, setOffset]);

  const zoomByFactor = useCallback((factor: number) => {
    const { width, height } = viewport.current;
    zoomAt(factor, width / 2, height / 2);
  }, [zoomAt]);

  const applyCenteredZoom = useCallback((nextZoom: number) => {
    const z = clampZoom(nextZoom);
    const { width, height } = viewport.current;
    setZoom(z);
    setOffset(width > 0 && height > 0 ? offsetForCenteredZoom(z, width, height) : { x: 0, y: 0 });
  }, [setZoom, setOffset]);

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [setZoom, setOffset]);

  // Kept for API compatibility: wheel zoom is handled by the native,
  // non-passive listener below (React's onWheel is passive, so it can't stop
  // the page from scrolling while the map zooms).
  const onWheel = () => {};

  /* ── Mouse pan ── */

  const onMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!allowPan) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!allowPan || !dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  useEffect(() => {
    const up = () => onMouseUp();
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  /* ── Wheel + touch (native listeners so preventDefault works) ── */

  useEffect(() => {
    const svg = svgRef?.current;
    if (!svg) return undefined;

    const local = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };

    const touch = {
      pinching: false,
      lastDist: 0,
      lastMid: { x: 0, y: 0 },
      panning: false,
      lastTouch: { x: 0, y: 0 },
    };
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => local((t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touch.pinching = true;
        touch.panning = false;
        touch.lastDist = dist(e.touches);
        touch.lastMid = mid(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1 && allowPan) {
        touch.panning = true;
        touch.pinching = false;
        touch.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touch.pinching && e.touches.length === 2) {
        e.preventDefault();
        const d = dist(e.touches);
        const m = mid(e.touches);
        if (touch.lastDist > 0) zoomAt(d / touch.lastDist, m.x, m.y);
        setOffset((o) => ({ x: o.x + (m.x - touch.lastMid.x), y: o.y + (m.y - touch.lastMid.y) }));
        touch.lastDist = d;
        touch.lastMid = m;
      } else if (touch.panning && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - touch.lastTouch.x;
        const dy = t.clientY - touch.lastTouch.y;
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
        touch.lastTouch = { x: t.clientX, y: t.clientY };
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) touch.pinching = false;
      if (e.touches.length === 0) touch.panning = false;
    };

    svg.addEventListener("wheel", onWheelNative, { passive: false });
    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      svg.removeEventListener("wheel", onWheelNative);
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowPan, svgRef]);

  return {
    zoom,
    offset,
    dragging,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    resetView,
    zoomByFactor,
    zoomAt,
    applyCenteredZoom,
    setZoom,
    setOffset,
  };
}
