import { useEffect, useRef, useState, type FC } from "react";
import DxfCanvas from "./components/DxfCanvas";

interface Props {
  onSelectPlot?: (externalId: string | null) => void;
  onBookPlot?: (externalId: string) => void;
}

/**
 * Mounts DxfCanvas sized to its own container (not the browser window),
 * since this view is embedded directly inside a page layout rather than
 * filling the whole viewport like the standalone app's App.tsx does.
 *
 * Measures the actual rendered container box (getBoundingClientRect) and
 * tracks it with a ResizeObserver in addition to the window 'resize' event,
 * matching the pattern used by merit-dokiparru's own App.tsx -- the host
 * page's own layout can resize this container without `window` ever firing
 * a resize event, which would otherwise leave the SVG's width/height stale.
 */
const MapLayoutView: FC<Props> = ({ onSelectPlot, onBookPlot }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      <DxfCanvas
        width={size.width}
        height={size.height}
        onSelectPlot={onSelectPlot}
        onBookPlot={onBookPlot}
      />
    </div>
  );
};

export default MapLayoutView;
