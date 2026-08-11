import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Expand, Map, RefreshCw } from 'lucide-react';
import {
  MAP_LAYOUT_URL,
  mapBookingService,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
} from '../../services/mapBookingService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';

function statusCounts(plots) {
  return plots.reduce(
    (acc, p) => {
      const key = String(p.status || 'available').toLowerCase();
      if (acc[key] != null) acc[key] += 1;
      else acc.other += 1;
      return acc;
    },
    { available: 0, booked: 0, registered: 0, sold: 0, other: 0 }
  );
}

/**
 * Homepage / public map-layout section: live DXF layout embed + plot status board.
 */
export default function MapLayoutSection({ compact = true }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [viewerWarning, setViewerWarning] = useState('');

  async function loadPlots() {
    setLoading(true);
    try {
      const data = await mapBookingService.listPlots({ pageSize: 500, unique: true });
      setPlots(data.items || []);
    } catch {
      setPlots([]);
    } finally {
      setLoading(false);
    }
  }

  function reloadViewer() {
    setViewerWarning('');
    setIframeKey((k) => k + 1);
  }

  useEffect(() => {
    loadPlots();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      // Soft check only — never hide the iframe (fetch can false-negative).
      fetch(MAP_LAYOUT_URL, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }).catch(() => {
        if (!cancelled) {
          setViewerWarning(`If the map is blank, start the map layout app on ${MAP_LAYOUT_URL}`);
        }
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [iframeKey]);

  const counts = useMemo(() => statusCounts(plots), [plots]);
  const previewPlots = useMemo(() => plots.slice(0, compact ? 200 : 500), [plots, compact]);

  async function handleBook(plot) {
    if (!plot) return;
    if (!user) {
      toast.info('Please login as a customer to book a plot.');
      navigate('/login', { state: { from: '/map-layout', intent: 'map-layout' } });
      return;
    }
    if (!['customer', 'buyer', 'admin', 'sales_member', 'agent'].includes(user.role)) {
      toast.info('Only registered customers can book a plot.');
      return;
    }
    if (String(plot.status).toLowerCase() !== 'available') {
      toast.info('This plot is not available for booking.');
      return;
    }

    setBooking(true);
    try {
      const updated = await mapBookingService.bookPlot(plot.externalId || plot.id, {
        customerName: user.name,
        customerId: user.id,
      });
      toast.success(`Plot ${updated.plotNo || plot.plotNo} booked successfully.`);
      setSelected(updated);
      await loadPlots();
    } catch (err) {
      toast.error(err.message || 'Unable to book this plot.');
    } finally {
      setBooking(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">Map Layout</h2>
          <p className="mt-1 text-sm text-gray-500">
            Explore the interactive layout, check plot availability, and book your preferred plot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              loadPlots();
              reloadViewer();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            to="/map-layout"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
          >
            <Expand size={14} /> Open full map
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(PLOT_STATUS_LABELS).map(([key, label]) => (
          <div
            key={key}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PLOT_STATUS_COLORS[key] }}
            />
            {label}
            <span className="text-gray-400">({counts[key] || 0})</span>
          </div>
        ))}
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? 'lg:grid-cols-[1.6fr_1fr]' : 'lg:grid-cols-[2fr_1fr]'}`}>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#111] shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Map size={14} /> Interactive layout
            </span>
            <a
              href={MAP_LAYOUT_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Open in new tab
            </a>
          </div>
          {viewerWarning && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {viewerWarning}{' '}
              <button type="button" onClick={reloadViewer} className="underline">
                Retry
              </button>
            </div>
          )}
          <iframe
            key={iframeKey}
            title="Merit Map Layout"
            src={`${MAP_LAYOUT_URL}/?embed=1`}
            className={`w-full border-0 ${compact ? 'h-[420px]' : 'h-[70vh] min-h-[560px]'}`}
            loading="eager"
            referrerPolicy="no-referrer"
            onLoad={() => setViewerWarning('')}
          />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-brand-900">Plot availability</h3>
          <p className="mt-1 text-xs text-gray-500">
            {loading
              ? 'Loading plots…'
              : plots.length
                ? `${plots.length} plots synced from booking system`
                : 'No plots synced yet. Use the interactive map above — plot booking APIs are ready.'}
          </p>

          {previewPlots.length > 0 && (
            <div className="mt-3 grid max-h-[280px] grid-cols-5 gap-1.5 overflow-auto sm:grid-cols-6 md:grid-cols-8">
              {previewPlots.map((plot) => {
                const status = String(plot.status || 'available').toLowerCase();
                const color = PLOT_STATUS_COLORS[status] || '#d1d5db';
                const active = selected && (selected.id === plot.id || selected.externalId === plot.externalId);
                return (
                  <button
                    key={plot.id || plot.externalId}
                    type="button"
                    title={`${plot.plotNo} · ${PLOT_STATUS_LABELS[status] || status}`}
                    onClick={() => setSelected(plot)}
                    className={`rounded-md px-1 py-2 text-center text-[11px] font-semibold leading-none tracking-tight text-gray-900 shadow-sm ring-offset-1 transition ${
                      active ? 'ring-2 ring-brand-600' : 'hover:brightness-95'
                    }`}
                    style={{
                      backgroundColor: color,
                      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    {plot.plotNo}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
            {selected ? (
              <div className="space-y-1.5">
                <p><span className="text-gray-500">Plot No:</span> <strong>{selected.plotNo}</strong></p>
                <p>
                  <span className="text-gray-500">Status:</span>{' '}
                  <strong>{PLOT_STATUS_LABELS[selected.status] || selected.status}</strong>
                </p>
                <p><span className="text-gray-500">Area:</span> {selected.plotArea ? `${selected.plotArea} Sq.Yds` : '—'}</p>
                <p><span className="text-gray-500">Facing:</span> {selected.facing || '—'}</p>
                <p><span className="text-gray-500">Cost:</span> {selected.plotCost ? `₹${Number(selected.plotCost).toLocaleString('en-IN')}` : '—'}</p>
                {String(selected.status).toLowerCase() === 'available' && (
                  <button
                    type="button"
                    disabled={booking}
                    onClick={() => handleBook(selected)}
                    className="mt-2 w-full rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                  >
                    {booking ? 'Booking…' : 'Book this plot'}
                  </button>
                )}
              </div>
            ) : (
              <p>Select a plot from the board{plots.length ? '' : ' once plots are synced'} to view details.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
