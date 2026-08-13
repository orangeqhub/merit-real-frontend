import { useMemo, useRef, useState } from 'react';

import { Link } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

import { Save, Upload, Eraser } from 'lucide-react';

import {

  mapBookingService,

  PLOT_TYPE_LABELS,

} from '../../services/mapBookingService';

import {

  MAP_PLOT_PHASE_COUNTS,

  parseMapPlotWorkbook,

} from '../../utils/parsePlotPricingSheet';

import { notifyMapDataUpdated } from '../../utils/mapDataSync';
import { formatInr, formatIndianNumber } from '../../utils/formatIndianNumber';
import { toast } from '../../store/toastStore';

import EmptyState from '../../components/common/EmptyState';



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



function draftKey(phase, plotNo) {

  return `${phase}-${plotNo}`;

}



/**

 * Admin workflow:

 * 1) Upload one Excel workbook (Phase 1 + Phase 2 sheets)

 * 2) Preview each phase → Save all → persist to API / map layout

 */

export default function MapPlots() {

  const { t } = useTranslation(['dashboard', 'common']);

  const fileInputRef = useRef(null);

  const [previewPhase, setPreviewPhase] = useState(1);

  const [workbook, setWorkbook] = useState(null);

  const [draftCosts, setDraftCosts] = useState({});

  const [dirty, setDirty] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);



  const rows = useMemo(() => {

    if (!workbook) return [];

    const source = previewPhase === 2 ? workbook.phase2Rows : workbook.phase1Rows;

    return source.map((row) => rowFromSheet(row, previewPhase));

  }, [workbook, previewPhase]);



  const pricedCount = useMemo(

    () => rows.filter((r) => r.plotCost != null && Number(r.plotCost) > 0).length,

    [rows]

  );



  function clearBoard() {

    setWorkbook(null);

    setDraftCosts({});

    setDirty(false);

  }



  function initDrafts(parsed) {

    const drafts = {};

    for (const phaseNum of [1, 2]) {

      const source = phaseNum === 1 ? parsed.phase1Rows : parsed.phase2Rows;

      source.forEach((row) => {

        const mapped = rowFromSheet(row, phaseNum);

        drafts[draftKey(phaseNum, mapped.plotNo)] =

          mapped.plotCost != null && Number(mapped.plotCost) > 0 ? String(mapped.plotCost) : '';

      });

    }

    setDraftCosts(drafts);

  }



  async function handleWorkbookUpload(event) {

    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;



    setUploading(true);

    try {

      const parsed = await parseMapPlotWorkbook(file);

      setWorkbook(parsed);

      initDrafts(parsed);

      setDirty(true);

      setPreviewPhase(1);

      toast.success(

        `Loaded ${parsed.fileName}: Phase 1 (${parsed.phase1Rows.length}) + Phase 2 (${parsed.phase2Rows.length}). Review, then Save all.`

      );

    } catch (err) {

      toast.error(err.message || 'Unable to read workbook.');

      clearBoard();

    } finally {

      setUploading(false);

    }

  }



  function buildPhasePayload(phaseNum, sourceRows) {

    return sourceRows.map((row) => {

      const mapped = rowFromSheet(row, phaseNum);

      const raw = draftCosts[draftKey(phaseNum, mapped.plotNo)];

      const editedCost =

        raw === '' || raw == null ? mapped.plotCost : Number(raw);

      return {

        plotNo: mapped.plotNo,

        plotArea: mapped.plotArea,

        facing: mapped.facing,

        ratePerSqYd: mapped.ratePerSqYd,

        plotCost: Number.isFinite(editedCost) ? editedCost : mapped.plotCost,

        plotType: mapped.plotType || 'residential',

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

      const phase1 = buildPhasePayload(1, workbook.phase1Rows);

      const phase2 = buildPhasePayload(2, workbook.phase2Rows);



      const result = await mapBookingService.importSheet({ phase1, phase2 });



      const updated = Number(result?.updated || 0);

      const skipped = Number(result?.skipped || 0);

      notifyMapDataUpdated();

      try {

        window.postMessage({ type: 'merit-map-data-updated' }, '*');

      } catch {

        // ignore

      }



      setDirty(false);

      toast.success(

        `Saved ${updated} plots (Phase 1 + Phase 2)` +

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



  return (

    <div>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">

        <div>

          <h1 className="font-semibold text-brand-800">

            {t('admin.mapPlotsTitle', { defaultValue: 'Map Plots & Pricing' })}

          </h1>

          <p className="mt-1 text-sm text-gray-500">

            Upload one Excel workbook with Phase 1 and Phase 2 sheets, review, then Save all.

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

            to="/map-layout"

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



      <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[200px_1fr]">

        <label className="text-sm">

          <span className="mb-1 block text-xs font-medium text-gray-500">Preview phase</span>

          <select

            value={previewPhase}

            onChange={(e) => setPreviewPhase(Number(e.target.value) === 2 ? 2 : 1)}

            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"

            disabled={!workbook}

          >

            <option value={1}>Phase 1 (1–134)</option>

            <option value={2}>Phase 2 (135–272)</option>

          </select>

        </label>

        <div className="flex items-end">

          <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-gray-700">

            <strong>Flow:</strong> Upload Excel → preview Phase 1 &amp; Phase 2 →{' '}

            <strong>Save all</strong>. Nothing is written to the map until you save.

            <span className="mt-1 block">

              Workbook must contain sheets: <strong>Phase 1</strong> ({MAP_PLOT_PHASE_COUNTS.phase1}{' '}

              plots) and <strong>Phase 2</strong> ({MAP_PLOT_PHASE_COUNTS.phase2} plots).

            </span>

            {workbook ? (

              <span className="mt-1 block text-brand-800">

                Loaded: {workbook.fileName} · Phase 1: {workbook.phase1Rows.length} · Phase 2:{' '}

                {workbook.phase2Rows.length}

                {dirty ? ' (not saved yet)' : ' (saved)'}

              </span>

            ) : null}

          </div>

        </div>

      </div>



      <p className="mb-3 text-xs text-gray-500">

        {workbook

          ? `Preview Phase ${previewPhase}: ${rows.length} rows · ${pricedCount} with cost${

              dirty ? ' · pending save' : ''

            } · Total ${MAP_PLOT_PHASE_COUNTS.total} plots in workbook`

          : 'Board is empty. Upload an Excel workbook (.xlsx) with Phase 1 and Phase 2 sheets.'}

      </p>



      {!workbook ? (

        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">

          <EmptyState titleKey="empty.noData" />

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">

            Upload one Excel workbook containing both <strong>Phase 1</strong> and{' '}

            <strong>Phase 2</strong> worksheets, review each phase, then click Save all.

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


