import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Save, IndianRupee } from 'lucide-react';
import {
  mapBookingService,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
} from '../../services/mapBookingService';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';

function formatInr(value) {
  if (value == null || value === '' || Number(value) <= 0) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export default function MapPlots() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [draftCosts, setDraftCosts] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ratePerSqYd, setRatePerSqYd] = useState('');
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await mapBookingService.listPlots({
        pageSize: 500,
        unique: true,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      const items = data.items || [];
      setPlots(items);
      const nextDrafts = {};
      items.forEach((plot) => {
        nextDrafts[plot.plotNo] =
          plot.plotCost != null && Number(plot.plotCost) > 0 ? String(plot.plotCost) : '';
      });
      setDraftCosts(nextDrafts);
    } catch (err) {
      toast.error(err.message || 'Failed to load map plots');
      setPlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pricedCount = useMemo(
    () => plots.filter((p) => p.plotCost != null && Number(p.plotCost) > 0).length,
    [plots]
  );

  async function saveCost(plot) {
    const raw = draftCosts[plot.plotNo];
    const plotCost = raw === '' || raw == null ? null : Number(raw);
    if (raw !== '' && raw != null && !Number.isFinite(plotCost)) {
      toast.error('Enter a valid plot cost.');
      return;
    }
    setSavingId(plot.id || plot.plotNo);
    try {
      await mapBookingService.updatePricing(plot.plotNo, { plotNo: plot.plotNo, plotCost });
      toast.success(`Plot ${plot.plotNo} price updated.`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Unable to update price.');
    } finally {
      setSavingId(null);
    }
  }

  async function applyRate() {
    const rate = Number(ratePerSqYd);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.error('Enter a valid rate per Sq.Yd.');
      return;
    }
    setBulkSaving(true);
    try {
      const result = await mapBookingService.bulkPricing({
        ratePerSqYd: rate,
        onlyEmpty,
      });
      toast.success(`Updated ${result.updated || 0} plot row(s) from rate × area.`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Bulk pricing failed.');
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-brand-800">
            {t('admin.mapPlotsTitle', { defaultValue: 'Map Plots & Pricing' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('admin.mapPlotsHint', {
              defaultValue: 'Set plot prices shown on the public map board and layout popup.',
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500">Search plot no</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="e.g. 42"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {Object.entries(PLOT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={load}
            className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
          <IndianRupee size={16} />
          Bulk price from rate × area
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-600">Rate per Sq.Yd (₹)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={ratePerSqYd}
              onChange={(e) => setRatePerSqYd(e.target.value)}
              className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. 12000"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyEmpty}
              onChange={(e) => setOnlyEmpty(e.target.checked)}
            />
            Only plots without a price
          </label>
          <button
            type="button"
            disabled={bulkSaving}
            onClick={applyRate}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {bulkSaving ? 'Applying…' : 'Apply rate'}
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {loading
          ? 'Loading plots…'
          : `${plots.length} unique plots · ${pricedCount} priced`}
      </p>

      {!loading && plots.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <div className="overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3">Plot No</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Area</th>
                <th className="px-3 py-3">Current cost</th>
                <th className="px-3 py-3">Set cost (₹)</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {plots.map((plot) => {
                const status = String(plot.status || 'available').toLowerCase();
                const busy = savingId === (plot.id || plot.plotNo);
                return (
                  <tr key={plot.id || plot.plotNo} className="border-t border-gray-100">
                    <td className="px-3 py-2.5 font-semibold text-brand-900">{plot.plotNo}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-gray-900"
                        style={{ backgroundColor: PLOT_STATUS_COLORS[status] || '#e5e7eb' }}
                      >
                        {PLOT_STATUS_LABELS[status] || status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {plot.plotArea ? `${plot.plotArea} Sq.Yds` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{formatInr(plot.plotCost)}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draftCosts[plot.plotNo] ?? ''}
                        onChange={(e) =>
                          setDraftCosts((prev) => ({ ...prev, [plot.plotNo]: e.target.value }))
                        }
                        className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveCost(plot)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                      >
                        <Save size={14} />
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
