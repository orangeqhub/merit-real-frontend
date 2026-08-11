import { useEffect, useState } from 'react';

/** Live countdown toward booking expiry. */
export default function BookingCountdown({
  expiryDate,
  compact = false,
  awaitingDecision = false,
  underReview = false,
}) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    if (!expiryDate) {
      setParts(null);
      return undefined;
    }
    function tick() {
      const diff = new Date(expiryDate).getTime() - Date.now();
      if (diff <= 0) {
        setParts({ days: 0, hours: 0, mins: 0, secs: 0, expired: true });
        return;
      }
      setParts({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryDate]);

  if (!expiryDate) return <span className="text-xs text-gray-400">—</span>;
  if (!parts) return <span className="text-xs text-gray-400">…</span>;

  if (underReview) {
    return <span className="rounded bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">Under Review</span>;
  }
  if (parts.expired || awaitingDecision) {
    return (
      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
        Awaiting Admin Decision
      </span>
    );
  }

  if (compact) {
    return (
      <span className="font-mono text-xs font-semibold text-amber-800">
        {parts.days}d {String(parts.hours).padStart(2, '0')}:{String(parts.mins).padStart(2, '0')}:{String(parts.secs).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
      <p className="text-[11px] font-medium text-amber-800">Reservation ends in</p>
      <div className="mt-1 grid grid-cols-4 gap-1 text-amber-950">
        {[
          ['Days', parts.days],
          ['Hrs', parts.hours],
          ['Min', parts.mins],
          ['Sec', parts.secs],
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-sm font-bold tabular-nums">{String(value).padStart(2, '0')}</div>
            <div className="text-[10px] text-amber-700">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
