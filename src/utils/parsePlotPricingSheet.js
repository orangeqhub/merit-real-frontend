import * as XLSX from 'xlsx';

const PHASE1_MIN = 1;
const PHASE1_MAX = 134;
const PHASE1_COUNT = 134;
const PHASE2_MIN = 135;
const PHASE2_MAX = 272;
const PHASE2_COUNT = 138;
const TOTAL_PLOTS = 272;

function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function pickColumn(headers, candidates) {
  for (const candidate of candidates) {
    const hit = headers.find((h) => h.norm === candidate || h.norm.includes(candidate));
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

function plotNoNumeric(plotNo) {
  const n = Number(String(plotNo ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
}

function detectPlotType(rateCell) {
  const text = String(rateCell || '').trim().toLowerCase();
  if (!text) return 'residential';
  if (/immunit|amenit|open\s*space/.test(text)) return 'amenities';
  if (/commer/.test(text)) return 'commercial';
  if (/mortgage/.test(text)) return 'mortgage';
  return 'residential';
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
  const rateCol = pickColumn(headerRow, ['cost per sq yds', 'cost per sq.yds', 'rate per sq', 'rate']);
  const totalCol = pickColumn(headerRow, ['total cost', 'totalcost', 'plot cost']);

  if (plotCol == null) {
    throw new Error(`Could not find a "plot.no" column in the ${sheetLabel} sheet.`);
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i] || [];
    const plotNo = String(line[plotCol] ?? '').trim();
    if (!plotNo || plotNo.toLowerCase() === 'plot.no') continue;

    const rateRaw = rateCol != null ? line[rateCol] : '';
    const plotType = detectPlotType(rateRaw);
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
    });
  }

  if (!rows.length) {
    throw new Error(`No plot rows found in the ${sheetLabel} sheet.`);
  }

  return rows;
}

function validatePhaseRows(rows, phaseNum) {
  const min = phaseNum === 1 ? PHASE1_MIN : PHASE2_MIN;
  const max = phaseNum === 1 ? PHASE1_MAX : PHASE2_MAX;
  const expected = phaseNum === 1 ? PHASE1_COUNT : PHASE2_COUNT;
  const label = `Phase ${phaseNum}`;

  const seen = new Set();
  const duplicates = [];
  const invalid = [];

  for (const row of rows) {
    const n = plotNoNumeric(row.plotNo);
    if (!Number.isFinite(n) || n < min || n > max) {
      invalid.push(String(row.plotNo));
      continue;
    }
    if (seen.has(n)) duplicates.push(n);
    else seen.add(n);
  }

  const missing = [];
  for (let i = min; i <= max; i += 1) {
    if (!seen.has(i)) missing.push(i);
  }

  const issues = [];
  if (rows.length !== expected) {
    issues.push(`${label}: expected ${expected} rows, found ${rows.length}.`);
  }
  if (invalid.length) {
    issues.push(`${label}: invalid plot numbers (must be ${min}–${max}): ${invalid.slice(0, 8).join(', ')}${invalid.length > 8 ? '…' : ''}.`);
  }
  if (duplicates.length) {
    issues.push(`${label}: duplicate plot numbers: ${[...new Set(duplicates)].slice(0, 8).join(', ')}.`);
  }
  if (missing.length) {
    issues.push(`${label}: missing plot numbers (${missing.length}): ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? '…' : ''}.`);
  }

  return { issues, plotNumbers: seen };
}

/**
 * Validate Phase 1 + Phase 2 datasets from one workbook.
 */
export function validateMapPlotWorkbook({ phase1Rows, phase2Rows }) {
  const issues = [];

  if (!phase1Rows?.length) issues.push('Phase 1 sheet is empty.');
  if (!phase2Rows?.length) issues.push('Phase 2 sheet is empty.');
  if (issues.length) return issues;

  const v1 = validatePhaseRows(phase1Rows, 1);
  const v2 = validatePhaseRows(phase2Rows, 2);
  issues.push(...v1.issues, ...v2.issues);

  const overlap = [...v1.plotNumbers].filter((n) => v2.plotNumbers.has(n));
  if (overlap.length) {
    issues.push(`Duplicate plot numbers across sheets: ${overlap.slice(0, 8).join(', ')}.`);
  }

  const totalUnique = v1.plotNumbers.size + v2.plotNumbers.size;
  if (!issues.length && totalUnique !== TOTAL_PLOTS) {
    issues.push(`Expected ${TOTAL_PLOTS} unique plots total, found ${totalUnique}.`);
  }

  return issues;
}

/**
 * Parse Anne Enclave workbook with Phase 1 + Phase 2 worksheets.
 */
export async function parseMapPlotWorkbook(file) {
  if (!file) throw new Error('No file selected.');
  const name = String(file.name || '').toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    throw new Error('Please upload a valid Excel workbook (.xlsx or .xls).');
  }

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

  const phase1Rows = parseSheetMatrix(
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetByPhase[1]], { header: 1, defval: '' }),
    'Phase 1'
  );
  const phase2Rows = parseSheetMatrix(
    XLSX.utils.sheet_to_json(workbook.Sheets[sheetByPhase[2]], { header: 1, defval: '' }),
    'Phase 2'
  );

  const validationIssues = validateMapPlotWorkbook({ phase1Rows, phase2Rows });
  if (validationIssues.length) {
    throw new Error(validationIssues.join(' '));
  }

  return {
    fileName: file.name,
    sheetNames: { phase1: sheetByPhase[1], phase2: sheetByPhase[2] },
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
