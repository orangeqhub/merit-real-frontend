import * as XLSX from 'xlsx';

/** Anne Enclave (the only two-phase layout) reference counts. */
const PHASE1_COUNT = 134;
const PHASE2_COUNT = 138;
const TOTAL_PLOTS = 272;

/**
 * Per-layout workbook expectations.
 *
 * anne-enclave is the only two-phase layout (Phase 1 + Phase 2 worksheets).
 * Every other registered layout is single-phase — one worksheet, where the
 * plot number column (or row order when absent) carries that layout's own
 * plot numbers. No count is hardcoded for single-phase layouts: the rows
 * are matched to the layout's own MapPlots by (phase, plotNo) on import, so
 * the workbook can legitimately contain any subset (prices for all plots,
 * or only for a batch).
 */
export const MAP_LAYOUT_WORKBOOK_SPECS = {
  'anne-enclave': {
    key: 'anne-enclave',
    title: 'Sky line Infra Anne Enclave',
    phases: 2,
    phase1Expected: PHASE1_COUNT,
    phase2Expected: PHASE2_COUNT,
  },
};

/** Single-phase fallback used for every other registered layout. */
const SINGLE_PHASE_SPEC = { key: null, title: null, phases: 1 };

export function getMapPlotWorkbookSpec(layoutKey) {
  return MAP_LAYOUT_WORKBOOK_SPECS[layoutKey] || { ...SINGLE_PHASE_SPEC, key: layoutKey || null };
}

function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function pickColumn(headers, candidates) {
  // Prefer an exact normalized match first, then a substring match. This keeps
  // workbooks with a bare "Area" column (spec format: Plot Number, Area, Type,
  // Facing, Status, Rate/Cost per Sq.Yds, Customer, Total Cost) unambiguous:
  // "Area" must win under exact 'area' instead of "Cost per Sq.Yds" matching
  // the 'sq yds' substring. Anne's "Plot Sq.Yds" header still resolves via
  // exact 'plot sq yds', so the existing 2-phase workbook is unaffected.
  for (const candidate of candidates) {
    const hit = headers.find((h) => h.norm === candidate);
    if (hit) return hit.key;
  }
  for (const candidate of candidates) {
    const hit = headers.find((h) => h.norm.includes(candidate));
    if (hit) return hit.key;
  }
  return null;
}

function parseLooseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).replace(/,/g, '').trim();
  if (!text || /[a-zA-Z]/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function detectPlotType(rateCell) {
  const text = String(rateCell || '').trim().toLowerCase();
  if (!text) return 'residential';
  if (/immunit|amenit|open\s*space/.test(text)) return 'amenities';
  if (/commer/.test(text)) return 'commercial';
  if (/mortgage/.test(text)) return 'mortgage';
  return 'residential';
}

/** Map a sheet's Status cell to the canonical MapPlot enum (null = no change). */
function mapSheetStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const map = {
    available: 'available',
    avail: 'available',
    open: 'available',
    yes: 'available',
    '1': 'available',
    booked: 'booked',
    book: 'booked',
    reserved: 'booked',
    registered: 'registered',
    reg: 'registered',
    sold: 'sold',
  };
  return raw ? map[raw] || null : null;
}

/** Match worksheet names like "Phase 1", "phase1", "PHASE 1". */
export function matchPhaseSheetName(sheetName) {
  const normalized = String(sheetName || '')
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (normalized === 'phase 1' || normalized === 'phase1') return 1;
  if (normalized === 'phase 2' || normalized === 'phase2') return 2;
  return null;
}

function parseSheetMatrix(matrix, sheetLabel) {
  if (!matrix.length) {
    throw new Error(`${sheetLabel} sheet has no rows.`);
  }

  const headerRow = matrix[0].map((cell, index) => ({
    key: index,
    raw: cell,
    norm: normHeader(cell),
  }));

  const plotCol = pickColumn(headerRow, ['plot no', 'plot.no', 'plot number', 'plotno', 'p no', 'p.no']);
  const areaCol = pickColumn(headerRow, ['plot sq yds', 'plot sq.yds', 'sq yds', 'sq.yds', 'area']);
  const facingCol = pickColumn(headerRow, ['facing']);
  // "Amount / Sq. Yd" (and friends) is the rate column on the standard single
  // -phase pricing sheets; "Rate/Cost per Sq.Yds" stays the anne-enclave form.
  const rateCol = pickColumn(headerRow, [
    'cost per sq yds',
    'cost per sq.yds',
    'rate per sq yd',
    'rate per sq.yd',
    'rate per sq',
    'amount per sq yd',
    'amount per sq.yd',
    'amount / sq yd',
    'amount / sq.yd',
    'amount sq yd',
    'cost per sq yd',
    'rate',
  ]);
  const totalCol = pickColumn(headerRow, [
    'total cost',
    'totalcost',
    'plot cost',
    'total amount',
    'total amt',
    'total price',
    'costfromsheet',
    'cost from sheet',
    'total',
  ]);
  const statusCol = pickColumn(headerRow, ['status', 'plot status', 'availability']);
  const customerCol = pickColumn(headerRow, ['customer', 'customer name', 'allottee']);
  // Explicit plot type column ("Type": Residential / Mortgage / Amenities /
  // Commercial). Older sheets carry the type in the rate cell instead.
  const typeCol = pickColumn(headerRow, ['type', 'plot type', 'land use']);
  const plotTypeFor = (line, rateRaw) => {
    const typeCell = typeCol != null ? String(line[typeCol] ?? '').trim() : '';
    return typeCell ? detectPlotType(typeCell) : detectPlotType(rateRaw);
  };
  // Present-but-blank Customer = clear it ('');  no Customer column = null
  // (the import then leaves the stored customer untouched).
  const customerFor = (line) =>
    customerCol != null ? String(line[customerCol] ?? '').trim() : null;

  if (plotCol == null) {
    const rows = [];
    for (let i = 1; i < matrix.length; i += 1) {
      const line = matrix[i] || [];
      const hasData = line.some((cell) => cell != null && String(cell).trim() !== '');
      if (!hasData) continue;
      const rateRaw = rateCol != null ? line[rateCol] : '';
      const plotType = plotTypeFor(line, rateRaw);
      const plotArea = areaCol != null ? parseLooseNumber(line[areaCol]) : null;
      const ratePerSqYd = plotType === 'residential' ? parseLooseNumber(rateRaw) : null;
      let plotCost = totalCol != null ? parseLooseNumber(line[totalCol]) : null;
      if (plotCost == null && plotArea != null && ratePerSqYd != null) {
        plotCost = Math.round(plotArea * ratePerSqYd * 100) / 100;
      }
      rows.push({
        plotNo: String(rows.length + 1),
        plotArea,
        facing: facingCol != null ? String(line[facingCol] || '').trim() : '',
        ratePerSqYd,
        plotCost,
        plotType,
        rateRaw: rateRaw != null ? String(rateRaw) : '',
        status: statusCol != null ? mapSheetStatus(line[statusCol]) : null,
        customerName: customerFor(line),
      });
    }
    return rows;
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i] || [];
    const plotNo = String(line[plotCol] ?? '').trim();
    // Skip the header ghost, blank separator rows, and the workbook's
    // summary/footer row ("TOTAL", "Grand Total", ...) -- none of them are
    // plots and they must never be imported or matched against MapPlots.
    if (!plotNo || plotNo.toLowerCase() === 'plot.no') continue;
    if (/total/i.test(plotNo)) continue;

    const rateRaw = rateCol != null ? line[rateCol] : '';
    const plotType = plotTypeFor(line, rateRaw);
    const plotArea = areaCol != null ? parseLooseNumber(line[areaCol]) : null;
    const ratePerSqYd = plotType === 'residential' ? parseLooseNumber(rateRaw) : null;
    let plotCost = totalCol != null ? parseLooseNumber(line[totalCol]) : null;
    if (plotCost == null && plotArea != null && ratePerSqYd != null) {
      plotCost = Math.round(plotArea * ratePerSqYd * 100) / 100;
    }

    rows.push({
      plotNo,
      plotArea,
      facing: facingCol != null ? String(line[facingCol] || '').trim() : '',
      ratePerSqYd,
      plotCost,
      plotType,
      rateRaw: rateRaw != null ? String(rateRaw) : '',
      status: statusCol != null ? mapSheetStatus(line[statusCol]) : null,
      customerName: customerFor(line),
    });
  }

  if (!rows.length) {
    throw new Error(`No plot rows found in the ${sheetLabel} sheet.`);
  }

  return rows;
}

function validatePhaseRows(rows, phaseNum, expected) {
  const label = `Phase ${phaseNum}`;
  const issues = [];

  if (!rows?.length) {
    issues.push(`${label} sheet is empty.`);
    return { issues, plotNumbers: new Set() };
  }

  if (expected != null && rows.length !== expected) {
    issues.push(`${label}: expected exactly ${expected} plots, found ${rows.length}.`);
  }

  return { issues, plotNumbers: new Set(rows.map((_, i) => i)) };
}

/**
 * Validate Phase 1 + Phase 2 datasets from one workbook.
 * (Backward-compatible with the Anne Enclave 2-phase workbook.)
 */
export function validateMapPlotWorkbook({ phase1Rows, phase2Rows }) {
  const issues = [];

  if (!phase1Rows?.length) issues.push('Phase 1 sheet is empty.');
  if (!phase2Rows?.length) issues.push('Phase 2 sheet is empty.');
  if (issues.length) return issues;

  const v1 = validatePhaseRows(phase1Rows, 1, PHASE1_COUNT);
  const v2 = validatePhaseRows(phase2Rows, 2, PHASE2_COUNT);
  issues.push(...v1.issues, ...v2.issues);

  return issues;
}

/**
 * Parse a layout's plot-pricing workbook.
 *
 * Two-phase layouts (anne-enclave) must contain "Phase 1" + "Phase 2"
 * worksheets with the layout's exact expected plot counts.
 *
 * Single-phase layouts accept one worksheet — either named "Phase 1" or the
 * workbook's first sheet — carrying that layout's own plot numbers. The
 * returned object always exposes `phase1Rows`/`phase2Rows` plus
 * `singlePhase: true`, so the admin screen can render one phase only.
 *
 * @param {File} file
 * @param {{ key?: string, phases?: 1|2, phase1Expected?: number|null,
 *           phase2Expected?: number|null }|string} [layoutSpecOrKey]
 */
export async function parseMapPlotWorkbook(file, layoutSpecOrKey) {
  if (!file) throw new Error('No file selected.');
  const name = String(file.name || '').toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('Please upload a valid Excel workbook (.xlsx or .xls).');
  }

  const spec =
    typeof layoutSpecOrKey === 'string'
      ? getMapPlotWorkbookSpec(layoutSpecOrKey)
      : {
          ...SINGLE_PHASE_SPEC,
          ...(layoutSpecOrKey || {}),
        };
  const twoPhase = Number(spec.phases) === 2;

  const buffer = await file.arrayBuffer();
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    throw new Error('Unable to read Excel workbook.');
  }

  if (!workbook.SheetNames?.length) {
    throw new Error('Workbook contains no worksheets.');
  }

  let phase1Rows = [];
  let phase2Rows = [];
  let sheetNames = { phase1: null, phase2: null };

  if (twoPhase) {
    const sheetByPhase = { 1: null, 2: null };
    for (const sheetName of workbook.SheetNames) {
      const phase = matchPhaseSheetName(sheetName);
      if (phase && !sheetByPhase[phase]) {
        sheetByPhase[phase] = sheetName;
      }
    }

    if (!sheetByPhase[1] || !sheetByPhase[2]) {
      throw new Error('The uploaded Excel file must contain both Phase 1 and Phase 2 sheets.');
    }

    phase1Rows = parseSheetMatrix(
      XLSX.utils.sheet_to_json(workbook.Sheets[sheetByPhase[1]], { header: 1, defval: '' }),
      'Phase 1'
    );
    phase2Rows = parseSheetMatrix(
      XLSX.utils.sheet_to_json(workbook.Sheets[sheetByPhase[2]], { header: 1, defval: '' }),
      'Phase 2'
    );
    sheetNames = { phase1: sheetByPhase[1], phase2: sheetByPhase[2] };

    const v1 = validatePhaseRows(phase1Rows, 1, spec.phase1Expected ?? null);
    const v2 = validatePhaseRows(phase2Rows, 2, spec.phase2Expected ?? null);
    const validationIssues = [...v1.issues, ...v2.issues];
    if (validationIssues.length) {
      throw new Error(validationIssues.join(' '));
    }
  } else {
    // Single-phase: prefer a "Phase 1" sheet if present, else the first sheet.
    const phaseSheet =
      workbook.SheetNames.find((sn) => matchPhaseSheetName(sn) === 1) || workbook.SheetNames[0];
    phase1Rows = parseSheetMatrix(
      XLSX.utils.sheet_to_json(workbook.Sheets[phaseSheet], { header: 1, defval: '' }),
      String(phaseSheet || 'Plot')
    );
    sheetNames = { phase1: phaseSheet, phase2: null };
  }

  return {
    fileName: file.name,
    layoutKey: spec.key || null,
    singlePhase: !twoPhase,
    sheetNames,
    phase1Rows,
    phase2Rows,
  };
}

/**
 * Parse a single worksheet (legacy / CSV fallback).
 */
export async function parsePlotPricingSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Sheet is empty.');
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rows = parseSheetMatrix(matrix, sheetName);
  return { sheetName, rows };
}

export const MAP_PLOT_PHASE_COUNTS = {
  phase1: PHASE1_COUNT,
  phase2: PHASE2_COUNT,
  total: TOTAL_PLOTS,
};