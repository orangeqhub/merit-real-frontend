import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Save, Upload, Eraser } from 'lucide-react';
import {
  mapBookingService,
  PLOT_TYPE_LABELS,
} from '../../services/mapBookingService';
import { parsePlotPricingSheet } from '../../utils/parsePlotPricingSheet';
import { notifyMapDataUpdated } from '../../utils/mapDataSync';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';

function formatInr(value) {
  if (value == null || value === '' || Number(value) <= 0) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function rowFromSheet(row, phase) {
  const plotCost =
    row.plotCost != null && Number(row.plotCost) > 0
      ? Number(row.plotCost)
      : row.plotArea != null && row.ratePerSqYd != null
        ? Math.round(Number(row.plotArea) * Number(row.ratePerSqYd) * 100) / 100
        : null;

  return {
    plotNo: String(row.plotNo),
    phase,
    plotType: row.plotType || 'residential',
    status: 'available',
    plotArea: row.plotArea,
    facing: row.facing || '',
    ratePerSqYd: row.ratePerSqYd,
    plotCost,
    pending: true,
  };
}

/**
 * Admin workflow:
 * 1) Page starts empty
 * 2) Select phase → upload Excel → preview rows
 * 3) Review → Save all → persist to API / map layout
 */
export default function MapPlots() {
  const { t } = useTranslation(['dashboard', 'common']);
  const fileInputRef = useRef(null);
  const [phase, setPhase] = useState(1);
  const [rows, setRows] = useState([]);
  const [draftCosts, setDraftCosts] = useState({});
  const [fileName, setFileName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pricedCount = useMemo(
    () => rows.filter((r) => r.plotCost != null && Number(r.plotCost) > 0).length,
    [rows]
  );

  function clearBoard() {
    setRows([]);
    setDraftCosts({});
    setFileName('');
    setDirty(false);
  }

  function handlePhaseChange(next) {
    const value = Number(next) === 2 ? 2 : 1;
    if (dirty && rows.length) {
      const ok = window.confirm(
        `Switch to Phase ${value}? Unsaved uploaded rows for Phase ${phase} will be cleared.`
      );
      if (!ok) return;
    }
    setPhase(value);
    clearBoard();
  }

  async function handleSheetUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const parsed = await parsePlotPricingSheet(file);
      const nextRows = parsed.rows.map((row) => rowFromSheet(row, phase));
      const drafts = {};
      nextRows.forEach((row) => {
        drafts[row.plotNo] =
          row.plotCost != null && Number(row.plotCost) > 0 ? String(row.plotCost) : '';
      });
      setRows(nextRows);
      setDraftCosts(drafts);
      setFileName(file.name);
      setDirty(true);
      toast.success(
        `Phase ${phase}: loaded ${nextRows.length} rows from sheet. Review, then click Save all.`
      );
    } catch (err) {
      toast.error(err.message || 'Unable to read sheet.');
      clearBoard();
    } finally {
      setUploading(false);
    }
  }

  async function saveAll() {
    if (!rows.length) {
      toast.info('Upload a sheet first.');
      return;
    }

    setSaving(true);
    try {
      const payload = rows.map((row) => {
        const raw = draftCosts[row.plotNo];
        const editedCost =
          raw === '' || raw == null ? row.plotCost : Number(raw);
        return {
          plotNo: row.plotNo,
          plotArea: row.plotArea,
          facing: row.facing,
          ratePerSqYd: row.ratePerSqYd,
          plotCost: Number.isFinite(editedCost) ? editedCost : row.plotCost,
          plotType: row.plotType || 'residential',
        };
      });

      const result = await mapBookingService.importSheet({
        phase,
        rows: payload,
      });

      const updated = Number(result?.updated || 0);
      const skipped = Number(result?.skipped || 0);
      notifyMapDataUpdated();
      try {
        window.postMessage({ type: 'merit-map-data-updated' }, '*');
      } catch {
        // ignore
      }

      setDirty(false);
      setRows((prev) => prev.map((r) => ({ ...r, pending: false })));
      toast.success(
        `Phase ${phase}: saved ${updated} plots` +
          (skipped ? `, skipped ${skipped}` : '') +
          '. Visible on Map Layout.'
      );
      if (result?.errors?.length) {
        toast.info(
          `First skip: plot ${result.errors[0].plotNo || '—'} — ${result.errors[0].reason}`
        );
      }
    } catch (err) {
      toast.error(err.message || 'Unable to save sheet data.');
    } finally {
      setSaving(false);
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
            Select a phase, upload the Excel sheet, review the rows, then click Save all.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleSheetUpload}
          />
          <Link
            to="/map-layout"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Map Layout
          </Link>
          <button
            type="button"
            disabled={!rows.length}
            onClick={clearBoard}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Eraser size={16} />
            Clear board
          </button>
          <button
            type="button"
            disabled={saving || !rows.length}
            onClick={saveAll}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save all'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:opacity-60"
          >
            <Upload size={16} />
            {uploading ? 'Reading…' : `Upload Phase ${phase} sheet`}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[200px_1fr]">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500">Phase</span>
          <select
            value={phase}
            onChange={(e) => handlePhaseChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value={1}>Phase 1</option>
            <option value={2}>Phase 2</option>
          </select>
        </label>
        <div className="flex items-end">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-gray-700">
            <strong>Flow:</strong> Phase → Upload Excel → review table → <strong>Save all</strong>.
            Nothing is written to the map until you save.
            {fileName ? (
              <span className="mt-1 block text-brand-800">
                Loaded file: {fileName}
                {dirty ? ' (not saved yet)' : ' (saved)'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500">
        {rows.length
          ? `Phase ${phase}: ${rows.length} rows from sheet · ${pricedCount} with cost${
              dirty ? ' · pending save' : ''
            }`
          : `Phase ${phase}: board is empty. Upload an Excel/CSV to preview plots.`}
      </p>

      {!rows.length ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
          <EmptyState titleKey="empty.noData" />
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Select Phase 1 or Phase 2, upload the Excel sheet, review the rows, then click Save all.
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3">Plot No</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Area</th>
                <th className="px-3 py-3">Facing</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Cost from sheet</th>
                <th className="px-3 py-3">Edit cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((plot) => (
                <tr key={`${phase}-${plot.plotNo}`} className="border-t border-gray-100">
                  <td className="px-3 py-2.5 font-semibold text-brand-900">{plot.plotNo}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {PLOT_TYPE_LABELS[plot.plotType] || plot.plotType || 'Residential'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {plot.plotArea != null ? `${plot.plotArea} Sq.Yds` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{plot.facing || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {plot.ratePerSqYd ? formatInr(plot.ratePerSqYd) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{formatInr(plot.plotCost)}</td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftCosts[plot.plotNo] ?? ''}
                      onChange={(e) => {
                        setDirty(true);
                        setDraftCosts((prev) => ({
                          ...prev,
                          [plot.plotNo]: e.target.value,
                        }));
                      }}
                      className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
