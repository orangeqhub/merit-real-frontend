import { useEffect, useMemo, useRef, useState } from "react";
import DxfCanvas from "./DxfCanvas";
import parseDXF from "../utils/parseDXF";
import { DXFDrawing } from "../types/dxf";

import GeometryAnalyzer from "../utils/geometry/GeometryAnalyzer";
import SnapEngine from "../utils/geometry/SnapEngine";
import GraphBuilder from "../utils/geometry/GraphBuilder";
import ConnectedComponents from "../utils/geometry/ConnectedComponents";

import { setActiveLayoutFromUrl, getLayoutByKey } from "../layouts";

const isEmbed =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("embed") === "1";

interface DxfViewerProps {
  /** Additive: native (non-iframe) host hook for plot selection. */
  onSelectPlot?: (externalId: string | null) => void;
  /** Additive: native (non-iframe) host hook for the booking action. */
  onBookPlot?: (externalId: string) => void;
}

const DxfViewer = ({ onSelectPlot, onBookPlot }: DxfViewerProps = {}) => {
  const layout = useMemo(() => setActiveLayoutFromUrl(), []);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [drawing, setDrawing] = useState<DXFDrawing | null>(null);
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: isEmbed ? Math.max(320, window.innerHeight) : window.innerHeight,
  });

  const initialized = useRef(false);

  useEffect(() => {
    const measure = () => {
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width || window.innerWidth)),
        height: Math.max(1, Math.floor(rect.height || window.innerHeight)),
      });
    };

    measure();
    window.addEventListener("resize", measure);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && hostRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(hostRef.current);
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (layout.dataSource === "dxf" && layout.dxfText) {
      try {
        const parsed = parseDXF(layout.dxfText);
        let segments = GeometryAnalyzer.extractSegments(parsed.entities);
        segments = SnapEngine.snap(segments, 1);
        GraphBuilder.build(segments);
        ConnectedComponents.analyze(segments);
        setDrawing(parsed);
      } catch (error) {
        console.error("DXF Parse Error:", error);
      }
    } else {
      // Image-based layout: no linework, the underlay renders the plan.
      setDrawing({ entities: [] });
    }
  }, [layout]);

  const activeLayout = getLayoutByKey(layout.key);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        // Natively mounted inside the host page: fill the host container (a
        // 100vh box would overflow it and push the fitted layout off-centre).
        height: "100%",
        minHeight: 320,
        overflow: "hidden",
        background: "#111",
      }}
    >
      {!drawing ? (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontSize: 22,
            fontWeight: "bold",
          }}
        >
          Loading {activeLayout.name}...
        </div>
      ) : (
        <DxfCanvas
          key={activeLayout.key}
          drawing={drawing}
          width={size.width}
          height={size.height}
          layout={activeLayout}
          onSelectPlot={onSelectPlot}
          onBookPlot={onBookPlot}
        />
      )}
    </div>
  );
};

export default DxfViewer;
