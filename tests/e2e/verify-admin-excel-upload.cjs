/* eslint-disable */
// End-to-end verification of the multi-layout Map Plots Excel upload:
//
//   Admin → Map Plots → select layout → upload Excel → Save all
//      → layout-scoped DB write (layoutKey + plotNo)
//      → public map / board / search / details card reflection
//      → cross-layout isolation
//
// Covers the spec's acceptance flow (§1-§18):
//   - layout selector populated from the layout registry (6 options)
//   - Mandira Developers upload with Status + Customer columns
//   - result summary (processed / updated / skipped / unmatched never created)
//   - Mandira plot 25 updated; plot 25 untouched in Anne/Sri/Elite/Manjunadha/Vinfra
//   - board search + details card show uploaded Status + Customer on the map page
//   - second layout (Vinfra) upload via the same UI — pricing-only sheet
//   - unknown layout rejected by the API (400 UNKNOWN_LAYOUT)
//   - exact restore afterwards (seed state untouched)
//
// Requires: backend :3001, frontend :3000 and the map apps running locally.
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const http = require('http');

const CHROME = 'C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001/api';

const LAYOUT_TITLES = [
  'Sky line Infra Anne Enclave',
  'Sri Lakshmi Divine City',
  'Elite Sky City',
  'Manjunadha Enclave',
  'V Infra ORR Nandana Vanam @ Saripudi',
  'Mandira Developers Quantum City',
];

let PASS = 0;
let FAIL = 0;
function record(name, ok, detail = '') {
  if (ok) {
    PASS += 1;
    console.log(`  PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    FAIL += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// API helpers (Node http against localhost:3001 — no CORS involvement)
// ---------------------------------------------------------------------------
function apiReq(method, pathname, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const finalPath = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
    const r = http.request(
      {
        host: 'localhost',
        port: 3001,
        path: finalPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(b); } catch { /* noop */ }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) r.write(payload);
    r.end();
  });
}

let TOKEN = null;
async function adminToken() {
  if (TOKEN) return TOKEN;
  const login = await apiReq('POST', '/auth/admin/login', {
    identifier: 'admin@merit.com',
    password: 'Admin@123',
  });
  TOKEN = login.body?.data?.token || null;
  return TOKEN;
}

/** True seeded state for the plots this test mutates (restore target). */
const ORIGINALS = {
  'mandira-developers-25': { status: 'available', customerName: null, plotArea: 359.94, ratePerSqYd: null, plotCost: null },
  'vinfra-7': { status: 'available', customerName: null, plotArea: 153.61, ratePerSqYd: null, plotCost: null },
  'vinfra-8': { status: 'available', customerName: null, plotArea: 155.28, ratePerSqYd: null, plotCost: null },
};

/** Force a plot back to a known state using the scoped pricing + status APIs. */
async function forcePlotState(targetKey, id, state) {
  await apiReq('PATCH', `/map/plots/${encodeURIComponent(id)}/status`, { status: state.status, customerName: state.customerName }, TOKEN);
  await apiReq('PATCH', `/map/plots/${encodeURIComponent(id)}/pricing`, {
    id,
    plotArea: state.plotArea,
    ratePerSqYd: state.ratePerSqYd,
    plotCost: state.plotCost,
  }, TOKEN);
}

/** Snapshot one plot by layoutKey + plotNo (the new scoped lookup). */
async function snapPlot(layout, plotNo) {
  const res = await apiReq('GET', `/map/plots/${encodeURIComponent(plotNo)}?layout=${encodeURIComponent(layout)}&plotNo=${encodeURIComponent(plotNo)}`);
  const d = res.body?.data;
  if (!d) return null;
  return {
    status: d.status,
    customerName: d.customerName || null,
    plotArea: d.plotArea != null ? Number(d.plotArea) : null,
    ratePerSqYd: d.ratePerSqYd != null ? Number(d.ratePerSqYd) : null,
    plotCost: d.plotCost != null ? Number(d.plotCost) : null,
  };
}

// ---------------------------------------------------------------------------
// Workbook builders (same column format the existing parser understands)
// ---------------------------------------------------------------------------
function buildMandiraWorkbook() {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Plot No', 'Area', 'Facing', 'Status', 'Customer', 'Cost per Sq.Yds', 'Total Cost'],
    [25, 359.94, 'East', 'Booked', 'Test Customer MK', 6500, 2339000],
    [999, 1000, 'North', 'Booked', 'Nobody', 9999, 9999999], // no such plot -> unmatched
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Phase 1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildVinfraWorkbook() {
  const wb = XLSX.utils.book_new();
  const data = [
    ['Plot No', 'Area', 'Cost per Sq.Yds', 'Total Cost'],
    [7, 150, 5500, 825000],
    [8, 165, 5400, 891000],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Plot');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ---------------------------------------------------------------------------
// Map-frame helpers (mirror the proven recipe from verify-all-layouts.cjs)
// ---------------------------------------------------------------------------
function mapFrameUrl(page) {
  return page.frames().find((f) => /localhost:(5174|5175|5176|5177|5183|5184)/.test(f.url())) || null;
}

async function gotoAndReady(page, key) {
  await page.goto(`${BASE}/map-layout/${key}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  for (let i = 0; i < 40; i++) {
    const mapFrame = mapFrameUrl(page);
    if (mapFrame) {
      const ok = await mapFrame
        .evaluate(() => document.querySelectorAll('svg polygon, .leaflet-interactive, .leaflet-overlay-pane path').length > 20)
        .catch(() => false);
      const hasBoard = await page
        .evaluate((k) => document.querySelectorAll(`[id^="${k}-"]`).length > 0, key)
        .catch(() => false);
      if (ok && hasBoard) {
        await sleep(1200);
        return mapFrame;
      }
    }
    await sleep(1500);
  }
  return mapFrameUrl(page) || null;
}

async function openBoard(page, id) {
  const open = await page
    .$eval(`#${id} [style*="grid-template-rows"]`, (el) =>
      typeof el.style.gridTemplateRows === 'string' ? el.style.gridTemplateRows !== '0fr' : false
    )
    .catch(() => false);
  if (!open) {
    await page.$eval(`#${id} [role="button"]`, (el) => el.click()).catch(() => {});
    await sleep(700);
  }
}

// ---------------------------------------------------------------------------
// Admin login helper
// ---------------------------------------------------------------------------
async function ensureAdminLogin(page) {
  await page.goto(`${BASE}/admin/map-plots`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* noop */ } });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 });
  await sleep(900);
  const pwd = page.locator('input[type="password"]');
  if (await pwd.count()) {
    await page.fill('input[type="text"]', 'admin@merit.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await Promise.all([
      page.waitForURL(/\/admin\//, { timeout: 15000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await sleep(1500);
  }
  await page.goto(`${BASE}/admin/map-plots`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForSelector('select', { timeout: 20000 });
}

// ---------------------------------------------------------------------------
// Main run
// ---------------------------------------------------------------------------
(async () => {
  const token = await adminToken();
  if (!token) throw new Error('Admin login failed — cannot run verification.');
  console.log(`admin token ok`);

  // ---- reset test plots to their true seeded state, then snapshot ----------
  await forcePlotState('mandira-developers-25', 'mnd-p-25', ORIGINALS['mandira-developers-25']);
  await forcePlotState('vinfra-7', 'vinfra-plot-007', ORIGINALS['vinfra-7']);
  await forcePlotState('vinfra-8', 'vinfra-plot-008', ORIGINALS['vinfra-8']);

  const OTHER_LAYOUTS = ['anne-enclave', 'sri-lakshmi', 'dokiparru', 'manjunadha-enclave', 'vinfra'];
  const beforeOther25 = {};
  for (const key of OTHER_LAYOUTS) {
    beforeOther25[key] = await snapPlot(key, '25');
  }
  const beforeMandira25 = await snapPlot('mandira-developers', '25');
  const beforeVinfra7 = await snapPlot('vinfra', '7');
  const beforeVinfra8 = await snapPlot('vinfra', '8');
  record(
    'setup: test plots reset to seeded originals',
    JSON.stringify(beforeMandira25) === JSON.stringify(ORIGINALS['mandira-developers-25']) &&
      JSON.stringify(beforeVinfra7) === JSON.stringify(ORIGINALS['vinfra-7']) &&
      JSON.stringify(beforeVinfra8) === JSON.stringify(ORIGINALS['vinfra-8']),
    `mandira25=${JSON.stringify(beforeMandira25)} v7=${JSON.stringify(beforeVinfra7)}`
  );
  console.log('before: mandira25 =', JSON.stringify(beforeMandira25));

  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  try {
    // ---- §18.1-4: admin login + Map Plots + layout selector ----------------
    await ensureAdminLogin(page);
    const opts = await page.$$eval('select option', (els) => els.map((o) => o.textContent.trim()));
    record(
      'admin: layout selector shows all 6 registered layouts',
      LAYOUT_TITLES.every((t) => opts.includes(t)),
      `options=${opts.join(' | ')}`
    );

    // ---- §18.5-8: Mandira upload -------------------------------------------
    await page.selectOption('select', 'mandira-developers');
    await sleep(600);
    const hint = await page.locator('div:has-text("Single Phase")').first().innerText().catch(() => '');
    record('admin: layout switch shows Mandira Developers Quantum City',
      /Mandira Developers Quantum City/.test(hint), hint.replace(/\s+/g, ' ').slice(0, 90));

    const mandiraBuf = buildMandiraWorkbook();
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merit-excel-'));
    const mandiraPath = path.join(tmpDir, 'mandira-test.xlsx');
    const vinfraPath = path.join(tmpDir, 'vinfra-test.xlsx');
    fs.writeFileSync(mandiraPath, mandiraBuf);
    fs.writeFileSync(vinfraPath, buildVinfraWorkbook());

    await page.setInputFiles('input[type="file"]', mandiraPath);
    await page.waitForFunction(
      () => document.body.innerText.includes('Loaded: mandira-test.xlsx'),
      null,
      { timeout: 15000 }
    );
    await sleep(800);
    const preview25 = await page
      .locator('tbody tr', { has: page.locator('td', { hasText: /^25$/ }) })
      .first()
      .innerText()
      .catch(() => '');
    record(
      'admin: preview shows Status + Customer from sheet',
      /Booked/.test(preview25) && /Test Customer MK/.test(preview25),
      preview25.replace(/\s+/g, ' ').slice(0, 120)
    );
    record(
      'admin: preview Area bound to Area column (359.94, not rate 6500)',
      /359\.94 Sq\.Yds/.test(preview25),
      preview25.replace(/\s+/g, ' ').slice(0, 120)
    );

    await page.click('button:has-text("Save all")');
    await page.waitForFunction(
      () => /Upload Result · Mandira Developers Quantum City/.test(document.body.innerText),
      null,
      { timeout: 20000 }
    );
    const boxText = await page
      .evaluate(() => Array.from(document.querySelectorAll('div')).find((el) => /Upload Result/.test(el.textContent || ''))?.innerText || '')
      .catch(() => '');
    record(
      'admin: upload result summary (2 processed / 1 updated / 1 skipped)',
      /2 processed/.test(boxText) && /1 updated/.test(boxText) && /1 skipped/.test(boxText),
      boxText.replace(/\s+/g, ' ').slice(0, 130)
    );

    // ---- §16: isolation via API --------------------------------------------
    const afterMandira25 = await snapPlot('mandira-developers', '25');
    record(
      'API: mandira plot 25 updated (booked + customer + area 359.94 + cost)',
      afterMandira25 && afterMandira25.status === 'booked' &&
        afterMandira25.customerName === 'Test Customer MK' &&
        afterMandira25.plotArea === 359.94 &&
        afterMandira25.plotCost === 2339000,
      JSON.stringify(afterMandira25)
    );
    for (const key of OTHER_LAYOUTS) {
      const after = await snapPlot(key, '25');
      const before = beforeOther25[key];
      record(
        `API: ${key} plot 25 unchanged`,
        !!after && !!before &&
          after.status === before.status &&
          after.customerName === before.customerName &&
          after.plotCost === before.plotCost,
        after ? `${after.status}/${after.plotCost}` : 'missing'
      );
    }
    const missing999 = await apiReq('GET', '/map/plots/999?layout=mandira-developers&plotNo=999');
    record('API: unmatched plot 999 never created (stays 404)', missing999.status === 404,
      `status=${missing999.status}`);

    // ---- §18.9-14: map reflection ------------------------------------------
    const mapFrame = await gotoAndReady(page, 'mandira-developers');
    const allBoard = 'mandira-developers-all-board';
    const searchInput = `board-search-${allBoard}`;
    record('map: mandira map loads', !!mapFrame, mapFrame ? new URL(mapFrame.url()).port : 'no frame');
    await openBoard(page, allBoard);
    await page.fill(`#${searchInput}`, '');
    await page.fill(`#${searchInput}`, '25');
    await sleep(1500);
    const boardText = await page.$eval(`#${allBoard}`, (el) => el.innerText).catch(() => '');
    record(
      'map: board search 25 -> details card shows uploaded Status + Customer',
      /Customer/.test(boardText) && /Test Customer MK/.test(boardText) && /Booked/.test(boardText),
      boardText.replace(/\s+/g, ' ').slice(0, 200)
    );

    // ---- §18.17: second layout (Vinfra) via the SAME UI --------------------
    await page.goto(`${BASE}/admin/map-plots`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForSelector('select', { timeout: 20000 });
    await page.selectOption('select', 'vinfra');
    await sleep(600);
    await page.setInputFiles('input[type="file"]', vinfraPath);
    await page.waitForFunction(
      () => document.body.innerText.includes('Loaded: vinfra-test.xlsx'),
      null,
      { timeout: 15000 }
    );
    await sleep(700);
    await page.click('button:has-text("Save all")');
    await page.waitForFunction(
      () => /Upload Result · V Infra ORR Nandana Vanam @ Saripudi/.test(document.body.innerText),
      null,
      { timeout: 20000 }
    );
    const vboxText = await page
      .evaluate(() => Array.from(document.querySelectorAll('div')).find((el) => /Upload Result/.test(el.textContent || ''))?.innerText || '')
      .catch(() => '');
    record(
      'admin: vinfra upload (2 processed / 2 updated / 0 skipped) — same uploader',
      /2 processed/.test(vboxText) && /2 updated/.test(vboxText) && /0 skipped/.test(vboxText),
      vboxText.replace(/\s+/g, ' ').slice(0, 130)
    );
    const afterVinfra7 = await snapPlot('vinfra', '7');
    const afterVinfra8 = await snapPlot('vinfra', '8');
    record(
      'API: vinfra 7+8 priced (area 150/165) AND status untouched (pricing-only sheet)',
      !!afterVinfra7 && !!afterVinfra8 &&
        afterVinfra7.plotArea === 150 && afterVinfra8.plotArea === 165 &&
        afterVinfra7.plotCost === 825000 && afterVinfra8.plotCost === 891000 &&
        afterVinfra7.status === 'available' && afterVinfra8.status === 'available',
      JSON.stringify({ v7: afterVinfra7, v8: afterVinfra8 })
    );
    const mandira25AfterVinfra = await snapPlot('mandira-developers', '25');
    record(
      'API: vinfra upload did NOT touch mandira plot 25',
      mandira25AfterVinfra && mandira25AfterVinfra.status === 'booked' &&
        mandira25AfterVinfra.customerName === 'Test Customer MK',
      JSON.stringify(mandira25AfterVinfra)
    );

    // ---- §12/§6: unknown layout rejected -----------------------------------
    const bad = await apiReq('POST', '/map/plots/import', {
      layout: 'karthikeya-infra',
      phase: 1,
      rows: [{ plotNo: '25', plotCost: 1 }],
    }, token);
    record('API: unknown layout import rejected (400 UNKNOWN_LAYOUT)', bad.status === 400, `${bad.status} ${bad.body?.code || ''}`);

    // ---- console / page error scan -----------------------------------------
    record(
      'admin + map pages: no fatal page errors',
      pageErrors.length === 0,
      pageErrors.length ? pageErrors.join(' || ') : 'clean'
    );

    // ---- exact restore (to the true seeded state, not a stale snapshot) -----
    await forcePlotState('mandira-developers-25', 'mnd-p-25', ORIGINALS['mandira-developers-25']);
    await forcePlotState('vinfra-7', 'vinfra-plot-007', ORIGINALS['vinfra-7']);
    await forcePlotState('vinfra-8', 'vinfra-plot-008', ORIGINALS['vinfra-8']);

    const restoredMandira = await snapPlot('mandira-developers', '25');
    const restoredV7 = await snapPlot('vinfra', '7');
    const restoredV8 = await snapPlot('vinfra', '8');
    record(
      'restore: mandira 25 back to original state',
      JSON.stringify(restoredMandira) === JSON.stringify(ORIGINALS['mandira-developers-25']),
      JSON.stringify(restoredMandira)
    );
    record(
      'restore: vinfra 7+8 back to original state',
      JSON.stringify(restoredV7) === JSON.stringify(ORIGINALS['vinfra-7']) &&
        JSON.stringify(restoredV8) === JSON.stringify(ORIGINALS['vinfra-8']),
      JSON.stringify({ v7: restoredV7, v8: restoredV8 })
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  } finally {
    await browser.close();
  }

  console.log(`\n===== ADMIN EXCEL UPLOAD VERIFICATION: ${PASS} PASS / ${FAIL} FAIL =====`);
  process.exit(FAIL > 0 ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});