export default function DualRangeSlider({ min, max, step = 1, valueMin, valueMax, onChange }) {
  const lo = Math.min(valueMin, valueMax);
  const hi = Math.max(valueMin, valueMax);
  const pctLo = ((lo - min) / (max - min)) * 100;
  const pctHi = ((hi - min) / (max - min)) * 100;

  return (
    <div className="relative h-8">
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
        style={{ left: `${pctLo}%`, width: `${pctHi - pctLo}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={(e) => onChange(Number(e.target.value), valueMax)}
        aria-label="Minimum value"
        className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={(e) => onChange(valueMin, Number(e.target.value))}
        aria-label="Maximum value"
        className="range-thumb pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 appearance-none bg-transparent"
      />
      <style>{`
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #556936;
          cursor: pointer;
          border: 2px solid #fffffe;
          box-shadow: 0 0 0 1px #556936;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: #556936;
          cursor: pointer;
          border: 2px solid #fffffe;
        }
      `}</style>
    </div>
  );
}
