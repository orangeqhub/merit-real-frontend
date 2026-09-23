import {
  STATUS_LABELS,
  type PlotInformation,
} from "../../models/PlotInformation";
import "./PropertyPopup.css";

interface PropertyPopupProps {
  plot: PlotInformation | null;
  onChange: (patch: Partial<PlotInformation>) => void;
  onClose: () => void;
  onBook?: (plot: PlotInformation) => void;
}

function formatInr(value: number) {
  if (!value || value <= 0) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function isSaleable(plot: PlotInformation) {
  return (
    String(plot.plotType || "residential").toLowerCase() === "residential" &&
    String(plot.status || "available").toLowerCase() === "available"
  );
}

export default function PropertyPopup({
  plot,
  onChange,
  onClose,
  onBook,
}: PropertyPopupProps) {
  if (!plot) return null;

  const setField = (field: keyof PlotInformation, value: string | number) => {
    onChange({ [field]: value } as Partial<PlotInformation>);
  };

  const canBook = isSaleable(plot);

  const rows: { label: string; node: React.ReactNode }[] = [
    {
      label: "Plot No",
      node: (
        <input
          value={plot.plotNo}
          onChange={(e) => setField("plotNo", e.target.value)}
          className="property-popup__input"
        />
      ),
    },
    {
      label: "Type",
      node: <div className="property-popup__input">{String(plot.plotType || "residential")}</div>,
    },
    {
      label: "Customer",
      node: (
        <input
          value={plot.customerName}
          placeholder="-"
          onChange={(e) => setField("customerName", e.target.value)}
          className="property-popup__input"
        />
      ),
    },
    {
      label: "Area (Sq.Yds)",
      node: (
        <input
          type="number"
          value={plot.plotArea || ""}
          placeholder="-"
          onChange={(e) =>
            setField("plotArea", e.target.value === "" ? 0 : Number(e.target.value))
          }
          className="property-popup__input"
        />
      ),
    },
    {
      label: "Facing",
      node: (
        <input
          value={plot.facing}
          placeholder="-"
          onChange={(e) => setField("facing", e.target.value)}
          className="property-popup__input"
        />
      ),
    },
    {
      label: "Status",
      node: (
        <div className="property-popup__input">
          {STATUS_LABELS[plot.status] ?? plot.status ?? "Available"}
        </div>
      ),
    },
    {
      label: "Rate / Sq.Yd",
      node: <div className="property-popup__input">{formatInr(Number(plot.ratePerSqYd || 0))}</div>,
    },
    {
      label: "Total Cost",
      node: (
        <input
          type="number"
          value={plot.plotCost || ""}
          placeholder="-"
          onChange={(e) =>
            setField("plotCost", e.target.value === "" ? 0 : Number(e.target.value))
          }
          className="property-popup__input"
        />
      ),
    },
  ];

  return (
    <div className="property-popup">
      <div className="property-popup__drag-handle" aria-hidden="true" />
      <div className="property-popup__header">
        <span>Plot details</span>
        <button
          type="button"
          onClick={onClose}
          className="property-popup__close"
        >
          ×
        </button>
      </div>
      <table className="property-popup__table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="property-popup__label">{row.label}</td>
              <td className="property-popup__value">{row.node}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canBook && (
        <div className="property-popup__footer">
          <button
            type="button"
            onClick={() => onBook?.(plot)}
            className="property-popup__book-btn"
          >
            Book Now
          </button>
        </div>
      )}
    </div>
  );
}
