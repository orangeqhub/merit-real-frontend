import { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 20;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export default function usePanZoom(allowPan = false) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const zoomByFactor = (factor: number) => {
    setZoom((z) => clampZoom(z * factor));
  };

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    zoomByFactor(e.deltaY < 0 ? 1.15 : 0.85);
  };

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

  return {
    zoom,
    offset,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    zoomByFactor,
    setZoom,
    setOffset,
  };
}
