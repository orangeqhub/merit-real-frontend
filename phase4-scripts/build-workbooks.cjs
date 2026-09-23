'use strict';
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'workbooks', 'phase4');
fs.mkdirSync(OUT_DIR, { recursive: true });

const HEADERS = ['Plot No', 'Plot Sq.Yds', 'Facing', 'Rate per Sq Yd', 'Total Cost', 'Status', 'Customer'];

function sheetFromRows(rows) {
  const data = [HEADERS, ...rows.map((r) => [r.plotNo, r.plotArea, r.facing || '', r.ratePerSqYd, r.plotCost, r.status, r.customerName])];
  return XLSX.utils.aoa_to_sheet(data);
}

// ---- Single-phase layouts: small 2-row workbooks ----
const SINGLE_PHASE_TESTS = {
  'sri-lakshmi': [
    { plotNo: '20', plotArea: 921, ratePerSqYd: 9210, plotCost: 921 * 9210, status: 'Booked', customerName: 'PH4-QA-sri-lakshmi-20' },
    { plotNo: '21', plotArea: 922, ratePerSqYd: 9220, plotCost: 922 * 9220, status: 'Booked', customerName: 'PH4-QA-sri-lakshmi-21' },
  ],
  'manjunadha-enclave': [
    { plotNo: '1', plotArea: 931, ratePerSqYd: 9310, plotCost: 931 * 9310, status: 'Booked', customerName: 'PH4-QA-manjunadha-enclave-1' },
    { plotNo: '2', plotArea: 932, ratePerSqYd: 9320, plotCost: 932 * 9320, status: 'Booked', customerName: 'PH4-QA-manjunadha-enclave-2' },
  ],
  vinfra: [
    { plotNo: '2', plotArea: 941, ratePerSqYd: 9410, plotCost: 941 * 9410, status: 'Booked', customerName: 'PH4-QA-vinfra-2' },
    { plotNo: '3', plotArea: 942, ratePerSqYd: 9420, plotCost: 942 * 9420, status: 'Booked', customerName: 'PH4-QA-vinfra-3' },
  ],
  dokiparru: [
    { plotNo: '2', plotArea: 951, ratePerSqYd: 9510, plotCost: 951 * 9510, status: 'Booked', customerName: 'PH4-QA-dokiparru-2' },
    { plotNo: '3', plotArea: 952, ratePerSqYd: 9520, plotCost: 952 * 9520, status: 'Booked', customerName: 'PH4-QA-dokiparru-3' },
  ],
  'mandira-developers': [
    { plotNo: '1', plotArea: 961, ratePerSqYd: 9610, plotCost: 961 * 9610, status: 'Booked', customerName: 'PH4-QA-mandira-developers-1' },
    { plotNo: '2', plotArea: 962, ratePerSqYd: 9620, plotCost: 962 * 9620, status: 'Booked', customerName: 'PH4-QA-mandira-developers-2' },
  ],
};

const testValuesOut = {};

for (const [layoutKey, rows] of Object.entries(SINGLE_PHASE_TESTS)) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), 'Phase 1');
  const file = path.join(OUT_DIR, `${layoutKey}.xlsx`);
  XLSX.writeFile(wb, file);
  console.log('wrote', file);
  testValuesOut[layoutKey] = rows;
}

// ---- anne-enclave: full 134 + 138 row reproduction, only ids 938 & 1072 changed ----
const anneFull = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'phase4-acceptance-results', 'pre-snapshot-anne-full.json'), 'utf8'
));

const TARGET_CHANGES = {
  938: { plotArea: 971, ratePerSqYd: 9710, plotCost: 971 * 9710, status: 'Booked', customerName: 'PH4-QA-anne-enclave-p1-2' },
  1072: { plotArea: 972, ratePerSqYd: 9720, plotCost: 972 * 9720, status: 'Booked', customerName: 'PH4-QA-anne-enclave-p2-136' },
};

function toRow(dbRow) {
  const override = TARGET_CHANGES[dbRow.id];
  if (override) {
    testValuesOut['anne-enclave_' + dbRow.id] = { ...override, plotNo: dbRow.plotNo, phase: dbRow.phase, id: dbRow.id };
    return {
      plotNo: dbRow.plotNo,
      plotArea: override.plotArea,
      facing: dbRow.facing || '',
      ratePerSqYd: override.ratePerSqYd,
      plotCost: override.plotCost,
      status: override.status,
      customerName: override.customerName,
    };
  }
  return {
    plotNo: dbRow.plotNo,
    plotArea: dbRow.plotArea != null ? Number(dbRow.plotArea) : '',
    facing: dbRow.facing || '',
    ratePerSqYd: dbRow.ratePerSqYd != null ? Number(dbRow.ratePerSqYd) : '',
    plotCost: dbRow.plotCost != null ? Number(dbRow.plotCost) : '',
    status: dbRow.status ? dbRow.status.charAt(0).toUpperCase() + dbRow.status.slice(1) : '',
    customerName: dbRow.customerName || '',
  };
}

const phase1Rows = anneFull.filter((r) => r.phase === 1).map(toRow);
const phase2Rows = anneFull.filter((r) => r.phase === 2).map(toRow);

console.log('anne phase1 rows:', phase1Rows.length, 'phase2 rows:', phase2Rows.length);

if (phase1Rows.length !== 134 || phase2Rows.length !== 138) {
  console.error('UNEXPECTED PHASE COUNTS - aborting anne workbook build');
  process.exit(1);
}

const anneWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(anneWb, sheetFromRows(phase1Rows), 'Phase 1');
XLSX.utils.book_append_sheet(anneWb, sheetFromRows(phase2Rows), 'Phase 2');
const anneFile = path.join(OUT_DIR, 'anne-enclave.xlsx');
XLSX.writeFile(anneWb, anneFile);
console.log('wrote', anneFile);

fs.writeFileSync(
  path.join(__dirname, '..', 'phase4-acceptance-results', 'excel-test-input-values.json'),
  JSON.stringify(testValuesOut, null, 2)
);
console.log('done');
