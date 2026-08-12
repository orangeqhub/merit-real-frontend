import * as XLSX from 'xlsx';

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

function detectPlotType(rateCell) {
  const text = String(rateCell || '').trim().toLowerCase();
  if (!text) return 'residential';
  if (/immunit|amenit|open\s*space/.test(text)) return 'amenities';
  if (/commer/.test(text)) return 'commercial';
  if (/mortgage/.test(text)) return 'mortgage';
  return 'residential';
}

/**
 * Parse Anne Enclave pricing sheet (.xlsx / .csv) into import rows.
 */
export async function parsePlotPricingSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Sheet is empty.');
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!matrix.length) throw new Error('Sheet has no rows.');

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
    throw new Error('Could not find a "plot.no" column in the sheet.');
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

  if (!rows.length) throw new Error('No plot rows found in the sheet.');
  return { sheetName, rows };
}
