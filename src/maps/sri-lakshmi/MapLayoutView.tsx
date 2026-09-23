import type { FC } from "react";
import DxfViewer from "./components/DxfViewer";
import { PlotInfoProvider } from "./context/PlotInfoContext";

interface Props {
  onSelectPlot?: (externalId: string | null) => void;
  onBookPlot?: (externalId: string) => void;
}

/**
 * Mounts the Sri Lakshmi DxfViewer sized to its own container (not the
 * browser window), since this view is embedded directly inside a page
 * layout rather than filling the whole viewport like the standalone app's
 * App.tsx does.
 *
 * Unlike the mandira-developers port -- where MapLayoutView measures the
 * container itself and passes width/height straight into DxfCanvas --
 * Sri Lakshmi's own DxfViewer (ported unmodified from components/DxfViewer)
 * already measures ITS OWN host div via getBoundingClientRect + a
 * ResizeObserver and forwards the resulting size to DxfCanvas internally.
 * So this wrapper only needs to give DxfViewer a div that fills whatever
 * box the host page lays out for it; DxfViewer's own observer (tracked off
 * its own ref, not raw `window` dimensions) does the rest. A second,
 * redundant ResizeObserver here would just duplicate that work.
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
