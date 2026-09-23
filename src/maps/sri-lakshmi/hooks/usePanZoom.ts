import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 20;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/** Keep the layout center pinned to the viewport center at any zoom level. */
export function offsetForCenteredZoom(
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
) {
  return {
    x: (viewportWidth / 2) * (1 - zoom),
    y: (viewportHeight / 2) * (1 - zoom),
  };
}

export default function usePanZoom(
  allowPan = false,
  viewportWidth = 0,
  viewportHeight = 0
) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  /* ── Touch state refs (avoid re-renders during gesture) ── */
  const touchState = useRef({
    pinching: false,
    lastDist: 0,
    lastMid: { x: 0, y: 0 },
    panning: false,
    lastTouch: { x: 0, y: 0 },
  });

  const applyCenteredZoom = (nextZoom: number) => {
    const z = clampZoom(nextZoom);
    setZoom(z);
    if (viewportWidth > 0 && viewportHeight > 0) {
      setOffset(offsetForCenteredZoom(z, viewportWidth, viewportHeight));
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const zoomByFactor = (factor: number) => {
    setZoom((currentZoom) => {
      const nextZoom = clampZoom(currentZoom * factor);
      if (viewportWidth > 0 && viewportHeight > 0) {
        setOffset(offsetForCenteredZoom(nextZoom, viewportWidth, viewportHeight));
      }
      return nextZoom;
    });
  };

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    zoomByFactor(factor);
  };

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

    setOffset((o) => ({
      x: o.x + dx,
      y: o.y + dy,
    }));

    last.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  /* ── Touch handlers (attached via useEffect for passive:false) ── */

  useEffect(() => {
    const svg = document.querySelector(".map-viewport svg") as SVGSVGElement | null;
    if (!svg) return;

    function getTouchDist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchMid(t: TouchList) {
      return {
        x: (t[0].clientX + t[1].clientX) / 2,
        y: (t[0].clientY + t[1].clientY) / 2,
      };
    }

    function onTouchStart(e: TouchEvent) {
      const ts = touchState.current;
      if (e.touches.length === 2) {
        ts.pinching = true;
        ts.panning = false;
        ts.lastDist = getTouchDist(e.touches);
        ts.lastMid = getTouchMid(e.touches);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        if (allowPan) {
          ts.panning = true;
          ts.pinching = false;
          ts.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        /* Always prevent default on map SVG touch to stop iOS rubber-band scroll */
        e.preventDefault();
      }
    }

    function onTouchMove(e: TouchEvent) {
      const ts = touchState.current;
      if (ts.pinching && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const mid = getTouchMid(e.touches);
        const factor = dist / ts.lastDist;

        setZoom((prev) => {
          const next = clampZoom(prev * factor);
          const pinchZoom = next / prev;

          setOffset((o) => ({
            x: mid.x - (mid.x - o.x) * pinchZoom + (mid.x - ts.lastMid.x),
            y: mid.y - (mid.y - o.y) * pinchZoom + (mid.y - ts.lastMid.y),
          }));

          return next;
        });

        ts.lastDist = dist;
        ts.lastMid = mid;
      } else if (ts.panning && e.touches.length === 1 && allowPan) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - ts.lastTouch.x;
        const dy = t.clientY - ts.lastTouch.y;
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
        ts.lastTouch = { x: t.clientX, y: t.clientY };
      }
    }

    function onTouchEnd(e: TouchEvent) {
      const ts = touchState.current;
      if (e.touches.length < 2) {
        ts.pinching = false;
      }
      if (e.touches.length === 0) {
        ts.panning = false;
      }
    }

    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
  }, [allowPan, viewportWidth, viewportHeight]);

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

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
    applyCenteredZoom,
    setZoom,
    setOffset,
  };
}
