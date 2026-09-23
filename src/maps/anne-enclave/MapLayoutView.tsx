import type { FC } from "react";
import DxfViewer from "./components/DxfViewer";
import { PlotInfoProvider } from "./context/PlotInfoContext";

interface Props {
  onSelectPlot?: (externalId: string | null) => void;
  onBookPlot?: (externalId: string) => void;
}

/**
 * Mounts DxfViewer (and its PlotInfoProvider) sized to its own container,
 * matching the wrapper pattern used by the sri-lakshmi port (same component
 * family). DxfViewer itself already measures its own hostRef with a
 * ResizeObserver (copied verbatim from the standalone app), so this outer
 * container's job is just to give it a properly laid-out box inside the
 * host page -- a second, redundant ResizeObserver here would only duplicate
 * that work.
 */
const MapLayoutView: FC<Props> = ({ onSelectPlot, onBookPlot }) => {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <PlotInfoProvider>
        <DxfViewer onSelectPlot={onSelectPlot} onBookPlot={onBookPlot} />
      </PlotInfoProvider>
    </div>
  );
};

export default MapLayoutView;
