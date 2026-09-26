import { useMemo, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { Save, Upload, Eraser } from 'lucide-react';

import {
  mapBookingService,
  PLOT_TYPE_LABELS,
  PLOT_STATUS_LABELS,
} from '../../services/mapBookingService';

import {
  getMapPlotWorkbookSpec,
  parseMapPlotWorkbook,
} from '../../utils/parsePlotPricingSheet';

import { MAP_LAYOUTS, getMapLayoutByKey } from '../../config/mapLayouts';

import { notifyMapDataUpdated } from '../../utils/mapDataSync';
import { loadPlotIdentityIndex } from '../../maps/plotIdentity';
import { formatInr } from '../../utils/formatIndianNumber';
import { toast } from '../../store/toastStore';

import EmptyState from '../../components/common/EmptyState';

function rowFromSheet(row, phase, index) {
  // Prefer the plot number read from the sheet itself; fall back to the row
  // position (1-based) when the sheet has no plot-number column.
  const plotNo = row.plotNo != null && String(row.plotNo).trim() !== ''
    ? String(row.plotNo).trim()
    : String(index + 1);
  const plotCost =
    row.plotCost != null && Number(row.plotCost) > 0
      ? Number(row.plotCost)
      : row.plotArea != null && row.ratePerSqYd != null
        ? Math.round(Number(row.plotArea) * Number(row.ratePerSqYd) * 100) / 100
        : null;

  return {
    plotNo,
    phase,
    plotType: row.plotType || 'residential',
    status: row.status || null,
    customerName: row.customerName || null,
    plotArea: row.plotArea,
    facing: row.facing || '',
    ratePerSqYd: row.ratePerSqYd,
    plotCost,
    pending: true,
  };
}

function draftKey(phase, plotNo) {
  return `${phase}-${plotNo}`;
}

/**
 * Admin workflow (layout-scoped):
 * 1) Pick a layout (Anne Enclave is the only two-phase one)
 * 2) Upload the layout's Excel workbook
 * 3) Preview rows → Save all → persist to that layout's MapPlots only
 *
 * The layout key is always sent with the import, so one layout's upload can
 * never touch another layout's plots; rows are matched by layoutKey +
 * (phase, plotNo).
 */
export default function MapPlots() {
  const { t } = useTranslation(['dashboard', 'common']);

  const fileInputRef = useRef(null);

  // Layout scope for the whole screen — switching resets the preview board.
  const [layoutKey, setLayoutKey] = useState('anne-enclave');
  const layout = getMapLayoutByKey(layoutKey);
  const twoPhase = layout.phases === 2;
  const spec = getMapPlotWorkbookSpec(layout.key);

  const [previewPhase, setPreviewPhase] = useState(1);
  const [workbook, setWorkbook] = useState(null);
  const [draftCosts, setDraftCosts] = useState({});
  const [dirty, setDirty] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Verified-geometry identity for the loaded workbook's layout (null for
  // layouts matched by phase + plot number only, e.g. Anne Enclave).
  const [identity, setIdentity] = useState(null);

  const rows = useMemo(() => {
    if (!workbook) return [];
    const source =
      twoPhase && previewPhase === 2 ? workbook.phase2Rows : workbook.phase1Rows;
    return (source || []).map((row, i) => rowFromSheet(row, twoPhase && previewPhase === 2 ? 2 : 1, i));
  }, [workbook, previewPhase, twoPhase]);

  const phaseRowsByNum = useMemo(() => {
    if (!workbook) return { 1: [], 2: [] };
    return {
      1: (workbook.phase1Rows || []).map((row, i) => rowFromSheet(row, 1, i)),
      2: (workbook.phase2Rows || []).map((row, i) => rowFromSheet(row, 2, i)),
    };
  }, [workbook]);

  const pricedCount = useMemo(
    () => rows.filter((r) => r.plotCost != null && Number(r.plotCost) > 0).length,
    [rows]
  );

  const notOnMap = useMemo(
    () => (identity ? rows.filter((r) => !identity.isOnMap(r.plotNo)).map((r) => r.plotNo) : []),
    [rows, identity]
  );

  function clearBoard() {
    setWorkbook(null);
    setIdentity(null);
    setDraftCosts({});
    setDirty(false);
    setLastResult(null);
  }

  function initDrafts(parsed) {
    const drafts = {};
    const phases = twoPhase ? [1, 2] : [1];
    for (const phaseNum of phases) {
      const source = phaseNum === 2 ? parsed.phase2Rows : parsed.phase1Rows;
      (source || []).forEach((row, i) => {
        const mapped = rowFromSheet(row, phaseNum, i);
        drafts[draftKey(phaseNum, mapped.plotNo)] =
          mapped.plotCost != null && Number(mapped.plotCost) > 0 ? String(mapped.plotCost) : '';
      });
    }
    setDraftCosts(drafts);
  }

  function changeLayout(nextKey) {
    if (nextKey === layoutKey) return;
    setLayoutKey(nextKey);
    setWorkbook(null);
    setIdentity(null);
    setDraftCosts({});
    setPreviewPhase(1);
    setDirty(false);
    setLastResult(null);
  }

  async function handleWorkbookUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      // Scoped to the selected layout: two-phase workbooks must contain
      // Phase 1 + Phase 2 sheets; single-phase layouts take one sheet.
      const parsed = await parseMapPlotWorkbook(file, layout.key);
      setIdentity(twoPhase ? null : await loadPlotIdentityIndex(layout.key));
      setWorkbook(parsed);
      initDrafts(parsed);
      setDirty(true);
      setPreviewPhase(1);
      setLastResult(null);
      toast.success(
        twoPhase
          ? `Loaded ${parsed.fileName}: Phase 1 (${parsed.phase1Rows.length}) + Phase 2 (${parsed.phase2Rows.length}). Review, then Save all.`
          : `Loaded ${parsed.fileName}: ${parsed.phase1Rows.length} plots for ${layout.title}. Review, then Save all.`
      );
    } catch (err) {
      toast.error(err.message || 'Unable to read workbook.');
      clearBoard();
    } finally {
      setUploading(false);
    }
  }

  function buildPhasePayload(phaseNum, sourceRows) {
    return sourceRows.map((row, i) => {
      const mapped = rowFromSheet(row, phaseNum, i);
      const raw = draftCosts[draftKey(phaseNum, mapped.plotNo)];
      const editedCost =
        raw === '' || raw == null ? mapped.plotCost : Number(raw);
      // Stable identity from the map geometry lets the backend create this
      // layout's plot row if it doesn't exist yet (see src/maps/plotIdentity.js).
      const externalId = identity?.externalIdFor(mapped.plotNo) || null;
      return {
        ...(externalId ? { externalId } : {}),
        plotNo: mapped.plotNo,
        plotArea: mapped.plotArea,
        facing: mapped.facing,
        ratePerSqYd: mapped.ratePerSqYd,
        plotCost: Number.isFinite(editedCost) ? editedCost : mapped.plotCost,
        plotType: mapped.plotType || 'residential',
        // Only forwarded when the workbook actually carries these columns, so
        // pricing-only sheets never touch a plot's status/customer.
        ...(mapped.status ? { status: mapped.status } : {}),
        ...(mapped.customerName ? { customerName: mapped.customerName } : {}),
      };
    });
  }

  async function saveAll() {
    if (!workbook) {
      toast.info('Upload a workbook first.');
      return;
    }

    setSaving(true);
    try {
      const result = twoPhase
        ? await mapBookingService.importSheet({
            phase1: buildPhasePayload(1, phaseRowsByNum[1]),
            phase2: buildPhasePayload(2, phaseRowsByNum[2]),
            layout: layout.key,
          })
        : await mapBookingService.importSheet({
            phase: 1,
            rows: buildPhasePayload(1, phaseRowsByNum[1]),
            layout: layout.key,
          });

      const inserted = Number(result?.inserted || 0);
      const updated = Number(result?.updated || 0);
      const unchanged = Number(result?.unchanged || 0);
      const skipped = Number(result?.skipped || 0);
      const totalRows = Number(result?.totalRows) || inserted + updated + unchanged + skipped;
      // Every open map / Plot Board (this tab and other tabs) refetches the
      // layout from the API right away.
      notifyMapDataUpdated();
      try {
        window.postMessage({ type: 'merit-map-data-updated' }, '*');
      } catch {
        // ignore
      }

      setDirty(false);
      setLastResult({
        layoutKey: layout.key,
        title: layout.title,
        totalRows,
        inserted,
        updated,
        unchanged,
        skipped,
        errors: result?.errors || [],
      });
      toast.success(
        `Saved ${layout.title}${twoPhase ? ' (Phase 1 + Phase 2)' : ''}: ` +
          `${inserted} added, ${updated} updated, ${unchanged} unchanged` +
          (skipped ? `, skipped ${skipped}` : '') +
          '. Visible on Map Layout.'
      );
      if (result?.errors?.length) {
        toast.info(
          `First skip: plot ${result.errors[0].plotNo || '—'} — ${result.errors[0].reason}`
        );
      }
    } catch (err) {
      toast.error(err.message || 'Unable to save workbook data.');
    } finally {
      setSaving(false);
    }
  }

  const expectedHint = twoPhase
    ? `Workbook must contain sheets: Phase 1 (${
        spec.phase1Expected ?? 'N'
      } plots) and Phase 2 (${spec.phase2Expected ?? 'N'} plots).`
    : 'Workbook takes a single worksheet (named "Phase 1" or the first sheet) with this layout\'s own plot numbers.';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-brand-800">
            {t('admin.mapPlotsTitle', { defaultValue: 'Map Plots & Pricing' })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pick a layout, then upload its Excel workbook, review, and save. Uploads only ever update
            that layout&apos;s plots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleWorkbookUpload}
          />
          <Link
            to={`/map-layout/${encodeURIComponent(layout.key)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Map Layout
          </Link>
          <button
            type="button"
            disabled={!workbook}
            onClick={clearBoard}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Eraser size={16} />
            Clear board
          </button>
          <button
            type="button"
            disabled={saving || !workbook}
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
            {uploading ? 'Reading…' : 'Upload Map Plot Excel'}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[220px_1fr]">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500">Layout</span>
          <select
            value={layoutKey}
            onChange={(e) => changeLayout(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {MAP_LAYOUTS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        {twoPhase ? (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Preview phase</span>
            <select
              value={previewPhase}
              onChange={(e) => setPreviewPhase(Number(e.target.value) === 2 ? 2 : 1)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              disabled={!workbook}
            >
              <option value={1}>Phase 1 ({spec.phase1Expected ?? 'N'} plots)</option>
              <option value={2}>Phase 2 ({spec.phase2Expected ?? 'N'} plots)</option>
            </select>
          </label>
        ) : (
          <div className="flex items-end">
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-gray-700">
              <strong>Layout:</strong> {layout.title} · <strong>Single Phase</strong> · import
              matches rows by plot number inside this layout only.
            </div>
          </div>
        )}
        <div className="flex items-end">
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-gray-700">
            <strong>Flow:</strong> Upload Excel → preview → <strong>Save all</strong>. Nothing is
            written to the map until you save.
            <span className="mt-1 block">{expectedHint}</span>
            {workbook ? (
              <span className="mt-1 block text-brand-800">
                Loaded: {workbook.fileName} · Phase 1: {workbook.phase1Rows.length}
                {twoPhase ? ` · Phase 2: ${workbook.phase2Rows.length}` : ''}
                {dirty ? ' (not saved yet)' : ' (saved)'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {lastResult && (
        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-sm">
          <p className="font-semibold text-brand-900">Upload Result · {lastResult.title}</p>
          <p className="text-gray-700">
            ✓ <strong>{lastResult.totalRows}</strong> processed
          </p>
          <p className="text-gray-700">
            ✓ <strong>{lastResult.inserted}</strong> added
          </p>
          <p className="text-gray-700">
            ✓ <strong>{lastResult.updated}</strong> updated
          </p>
          <p className="text-gray-700">
            = <strong>{lastResult.unchanged}</strong> unchanged
          </p>
          <p className={lastResult.skipped ? 'text-amber-700' : 'text-gray-700'}>
            ⚠ <strong>{lastResult.skipped}</strong> skipped/unmatched
          </p>
          {lastResult.errors?.length ? (
            <p className="w-full text-xs text-amber-700">
              First skip: plot {lastResult.errors[0].plotNo ?? '—'} — {lastResult.errors[0].reason}
            </p>
          ) : null}
        </div>
      )}

      <p className="mb-3 text-xs text-gray-500">
        {workbook
          ? `Previewing ${layout.shortTitle || layout.title}${
              twoPhase ? ` Phase ${previewPhase}` : ''
            }: ${rows.length} rows · ${pricedCount} with cost${dirty ? ' · pending save' : ''}`
          : 'Board is empty. Upload an Excel workbook (.xlsx) for the selected layout.'}
      </p>

      {notOnMap.length > 0 && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notOnMap.length} row{notOnMap.length === 1 ? '' : 's'} (plot{' '}
          {notOnMap.slice(0, 8).join(', ')}
          {notOnMap.length > 8 ? ', …' : ''}) {notOnMap.length === 1 ? 'is' : 'are'} not drawn on the{' '}
          {layout.shortTitle || layout.title} map. They only update an existing plot record and are
          otherwise skipped.
        </p>
      )}

      {!workbook ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
          <EmptyState titleKey="empty.noData" />
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Select a layout above, then upload the layout&apos;s Excel pricing workbook. Saved
            details automatically appear on the plot details card for the matching layout and plot
            number — geometry is never rebuilt.
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
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Rate</th>
                <th className="px-3 py-3">Cost from sheet</th>
                <th className="px-3 py-3">Edit cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((plot) => (
                <tr key={`${previewPhase}-${plot.plotNo}`} className="border-t border-gray-100">
                  <td className="px-3 py-2.5 font-semibold text-brand-900">{plot.plotNo}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {PLOT_TYPE_LABELS[plot.plotType] || plot.plotType || 'Residential'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {plot.plotArea != null ? `${plot.plotArea} Sq.Yds` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{plot.facing || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {plot.status ? PLOT_STATUS_LABELS[plot.status] || plot.status : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{plot.customerName || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">
                    {plot.ratePerSqYd ? formatInr(plot.ratePerSqYd) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{formatInr(plot.plotCost)}</td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftCosts[draftKey(previewPhase, plot.plotNo)] ?? ''}
                      onChange={(e) => {
                        setDirty(true);
                        setDraftCosts((prev) => ({
                          ...prev,
                          [draftKey(previewPhase, plot.plotNo)]: e.target.value,
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