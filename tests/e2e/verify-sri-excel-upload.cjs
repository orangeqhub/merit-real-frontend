/* eslint-disable */
// End-to-end verification of the REAL Sri Lakshmi Divine City Excel upload:
//
//   Admin → Map Plots → select Sri Lakshmi Divine City → upload the real
//   Plot_Availability_279_Final.xlsx (279 plots) → Save all
//      → DB write (layoutKey + plotNo) for all 279 plots
//      → API reflects exact business values (area 180, ₹9,000, ₹16,20,000…)
//      → host /map-layout/sri-lakshmi board + details card reflect them
//      → embedded map tooltip reflects them
//      → fields NOT in the Excel (Type/Facing/Customer) are never invented:
//        Facing/Customer stay "—"/null; upload only touches sheet columns
//      → cross-layout isolation (other layouts' plot 1 untouched)
//
// NO RESTORE for sri-lakshmi on purpose: the desired end state IS the real
// Excel values (279 plots, all "available", rate ₹9,000, per-plot cost).
//
// Requires: backend :3001, frontend :3000 and all six map apps running.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');

const CHROME = 'C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://localhost:3000';
const API = 'http://localhost:3001/api';
const REAL_WORKBOOK = 'C:\\Users\\komma\\AppData\\Local\\Temp\\opencode\\plots.xlsx';

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
// API helpers (Node http against localhost:3001)
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
    facing: d.facing || null,
  };
}

async function listPlots(layout) {
  const res = await apiReq('GET', `/map/plots?layout=${encodeURIComponent(layout)}&pageSize=500`);
  const items = Array.isArray(res.body?.data?.items) ? res.body.data.items : [];
  return items.map((r) => ({
    plotNo: String(r.plotNo ?? '').trim(),
    status: r.status,
    plotArea: r.plotArea != null ? Number(r.plotArea) : null,
    ratePerSqYd: r.ratePerSqYd != null ? Number(r.ratePerSqYd) : null,
    plotCost: r.plotCost != null ? Number(r.plotCost) : null,
    customerName: r.customerName || null,
  }));
}

// ---------------------------------------------------------------------------
// Map-frame helpers (same contracts as verify-map-canvas-reflect.cjs)
// ---------------------------------------------------------------------------
async function iframeBoxOnScreen(mapFrame, key) {
  const iframeEl = mapFrame.page().locator(`iframe[data-layout-key="${key}"]`);
  await iframeEl
    .evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }))
    .catch(() => {});
  await sleep(500);
  return iframeEl.boundingBox().catch(() => null);
}

async function hoverTargetPoint(mapFrame, label) {
  return mapFrame
    .evaluate((target) => {
      const textEl = Array.from(
        document.querySelectorAll('svg text, svg tspan, .leaflet-marker-icon, .leaflet-tooltip')
      ).find(
        (t) => (t.textContent || '').trim() === String(target) && t.getClientRects().length
      );
      const polys = Array.from(document.querySelectorAll('svg polygon, svg path'));
      if (!textEl) return null;
      const tr = textEl.getBoundingClientRect();
      const cx = tr.left + tr.width / 2;
      const cy = tr.top + tr.height / 2;
      const cands = polys
        .map((p) => {
          const pr = p.getBoundingClientRect();
          return {
            left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom,
            area: pr.width * pr.height,
          };
        })
        .filter((c) => c.area < 400000 && cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom)
        .sort((a, b) => a.area - b.area);
      const onShape = (x, y) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return false;
        const t = (el.tagName || '').toLowerCase();
        return t === 'polygon' || t === 'path';
      };
      const points = [[cx, cy]];
      for (const c of cands.slice(0, 4)) points.push([(c.left + c.right) / 2, (c.top + c.bottom) / 2]);
      for (const c of cands.slice(0, 4)) {
        for (let gx = 0; gx <= 3; gx++) {
          for (let gy = 0; gy <= 3; gy++) {
            points.push([c.left + (c.right - c.left) * (gx / 3), c.top + (c.bottom - c.top) * (gy / 3)]);
          }
        }
      }
      for (const [x, y] of points) {
        if (onShape(x, y)) return { x, y };
      }
      return { x: cx, y: cy };
    }, label)
    .catch(() => null);
}

async function moveMouseOver(mapFrame, pt, key) {
  const fbox = await iframeBoxOnScreen(mapFrame, key);
  if (!fbox) return false;
  const page = mapFrame.page();
  const cx = fbox.x + pt.x;
  const cy = fbox.y + pt.y;
  await page.mouse.move(cx - 40, cy - 40, { steps: 4 });
  await page.mouse.move(cx, cy, { steps: 6 });
  return true;
}

async function tooltipText(mapFrame) {
  return mapFrame
    .evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, .leaflet-tooltip'));
      const hits = divs
        .filter((el) => {
          const t = el.textContent || '';
          return /Plot\s*\d/.test(t) && t.includes('Sq.Yds') && t.includes('Status');
        })
        .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
      const hit = hits[0];
      return hit ? hit.textContent.replace(/\s+/g, ' ').slice(0, 200) : null;
    })
    .catch(() => null);
}

async function hoverMapPlotByLabel(mapFrame, label, key) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pt = await hoverTargetPoint(mapFrame, label);
    if (!pt) return false;
    const moved = await moveMouseOver(mapFrame, pt, key);
    if (!moved) return false;
    await sleep(900);
    const tipText = await tooltipText(mapFrame);
    if (tipText) return tipText;
    await sleep(1200);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Admin login (UI)
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

  if (!fs.existsSync(REAL_WORKBOOK)) throw new Error(`Real workbook missing: ${REAL_WORKBOOK}`);

  // ---- pre-state snapshots -------------------------------------------------
  const OTHER_LAYOUTS = ['anne-enclave', 'dokiparru', 'manjunadha-enclave', 'vinfra', 'mandira-developers'];
  const beforeOther1 = {};
  for (const key of OTHER_LAYOUTS) beforeOther1[key] = await snapPlot(key, '1');
  const beforeSri = {
    1: await snapPlot('sri-lakshmi', '1'),
    2: await snapPlot('sri-lakshmi', '2'),
    22: await snapPlot('sri-lakshmi', '22'),
    279: await snapPlot('sri-lakshmi', '279'),
  };
  record('pre: sri-lakshmi plot rows exist (1/2/22/279)', Object.values(beforeSri).every(Boolean),
    JSON.stringify({ p1: beforeSri[1], p22: beforeSri[22] }));

  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  try {
    // ---- admin: upload the REAL workbook for Sri Lakshmi Divine City --------
    await ensureAdminLogin(page);
    await page.selectOption('select', 'sri-lakshmi');
    await sleep(600);
    const hint = await page.locator('div:has-text("Single Phase")').first().innerText().catch(() => '');
    record('admin: layout switch shows Sri Lakshmi Divine City',
      /Sri Lakshmi Divine City/.test(hint), hint.replace(/\s+/g, ' ').slice(0, 110));

    await page.setInputFiles('input[type="file"]', REAL_WORKBOOK);
    await page.waitForFunction(
      () => document.body.innerText.includes('Loaded: plots.xlsx') ||
            /Previewing Sri Lakshmi Divine City: 279 rows/.test(document.body.innerText),
      null,
      { timeout: 20000 }
    );
    await sleep(1200);

    const previewRow1 = await page
      .locator('tbody tr', { has: page.locator('td', { hasText: /^1$/ }) })
      .first()
      .innerText()
      .catch(() => '');
    record(
      'admin: preview Plot 1 row = 180 Sq.Yds / Available / ₹9,000 / ₹16,20,000',
      /180 Sq\.Yds/.test(previewRow1) && /Available/.test(previewRow1) &&
        /₹9,000/.test(previewRow1) && /₹16,20,000/.test(previewRow1),
      previewRow1.replace(/\s+/g, ' ').slice(0, 140)
    );
    record(
      'admin: preview Type=Facing=Customer not invented from sheet',
      /Residential/.test(previewRow1) && /— Available —/.test(previewRow1.replace(/\s+/g, ' ')),
      previewRow1.replace(/\s+/g, ' ').slice(0, 140)
    );

    // ---- save all ----------------------------------------------------------
    await page.click('button:has-text("Save all")');
    await page.waitForFunction(
      () => /Upload Result · Sri Lakshmi Divine City/.test(document.body.innerText),
      null,
      { timeout: 25000 }
    );
    const boxText = await page
      .evaluate(() => Array.from(document.querySelectorAll('div')).find((el) => /Upload Result/.test(el.textContent || ''))?.innerText || '')
      .catch(() => '');
    record(
      'admin: upload result = 279 processed / 279 updated / 0 skipped',
      /279 processed/.test(boxText) && /279 updated/.test(boxText) && /0 skipped/.test(boxText),
      boxText.replace(/\s+/g, ' ').slice(0, 130)
    );

    // ---- API: exact business values ----------------------------------------
    const EXPECTED = {
      1: { status: 'available', customerName: null, plotArea: 180, ratePerSqYd: 9000, plotCost: 1620000, facing: null },
      2: { status: 'available', customerName: null, plotArea: 189, ratePerSqYd: 9000, plotCost: 1701000, facing: null },
      22: { status: 'available', customerName: null, plotArea: 400, ratePerSqYd: 9000, plotCost: 3600000, facing: null },
      279: { status: 'available', customerName: null, plotArea: 220, ratePerSqYd: 9000, plotCost: 1980000, facing: null },
    };
    for (const [noStr, exp] of Object.entries(EXPECTED)) {
      const after = await snapPlot('sri-lakshmi', noStr);
      const ok = !!after &&
        after.status === exp.status && after.customerName === exp.customerName &&
        after.plotArea === exp.plotArea && after.ratePerSqYd === exp.ratePerSqYd &&
        after.plotCost === exp.plotCost && after.facing === exp.facing;
      record(`API: sri plot ${noStr} exact (area/rate/cost/status, no customer/facing)`, ok, JSON.stringify(after));
    }

    const sriList = await listPlots('sri-lakshmi');
    record('API: sri-lakshmi has exactly 279 rows', sriList.length === 279, `rows=${sriList.length}`);
    const plotNos = sriList.map((r) => r.plotNo);
    record(
      'API: no duplicate / blank / TOTAL / "0" plot numbers',
      new Set(plotNos).size === plotNos.length &&
        !plotNos.some((p) => !p || /total/i.test(p) || p === '0' || p === 'undefined'),
      `unique=${new Set(plotNos).size}`
    );
    record(
      'API: all 279 rows carry the sheet rate/cost (sheet total, no recalc)',
      sriList.every((r) => r.ratePerSqYd === 9000 && r.plotCost > 0 && r.plotCost === Math.round(r.plotArea * 9000 * 100) / 100),
      `costs=${sriList.filter((r) => r.plotCost == null).length} missing`
    );
    record(
      'API: no row got an invented customer/facing from the sheet',
      sriList.every((r) => !r.customerName && (r.status === 'available' || r.status === 'booked')),
      `customers=${sriList.filter((r) => r.customerName).length} faced=${sriList.filter((r) => r.facing).length}`
    );

    // ---- isolation: other layouts' plot 1 untouched --------------------------
    for (const key of OTHER_LAYOUTS) {
      const before = beforeOther1[key];
      const after = await snapPlot(key, '1');
      record(
        `API: ${key} plot 1 unchanged by sri upload`,
        !!before && !!after &&
          after.status === before.status && after.customerName === before.customerName &&
          after.plotCost === before.plotCost && after.plotArea === before.plotArea,
        after ? `${after.status}/${after.plotCost}` : 'missing'
      );
    }

    // ---- host page: /map-layout/sri-lakshmi board + details card ------------
    await page.goto(`${BASE}/map-layout/sri-lakshmi`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForSelector('iframe[data-layout-key="sri-lakshmi"]', { timeout: 20000 }).catch(() => {});
    await sleep(4000);

    const allBoard = 'sri-lakshmi-all-board';
    const boardEl = `#${allBoard}`;
    const open = await page
      .$eval(boardEl, (el) =>
        typeof el.style.gridTemplateRows === 'string' ? el.style.gridTemplateRows !== '0fr' : false
      )
      .catch(() => false);
    if (!open) {
      await page.$eval(`${boardEl} [role="button"]`, (el) => el.click()).catch(() => {});
      await sleep(700);
    }
    const searchSel = `#board-search-${allBoard}`;
    await page.fill(searchSel, '1');
    await sleep(1500);
    const chip = page.locator('button[title^="1 ·"]').first();
    const chipOk = await chip.isVisible().catch(() => false);
    if (chipOk) await chip.click().catch(() => {});
    await sleep(800);
    const boardText = await page.$eval(boardEl, (el) => el.innerText.replace(/\s+/g, ' ')).catch(() => '');
    record(
      'host: details card shows Plot No 1 · 180 Sq.Yds · Available',
      /Plot No:\s*1\b/.test(boardText) && /180 Sq\.Yds/.test(boardText) && /Available/.test(boardText),
      boardText.slice(0, 260) || '(board empty)'
    );
    record(
      'host: details card shows Rate ₹9,000 / Sq.Yd and Total cost ₹16,20,000',
      /₹9,000 \/ Sq\.Yd/.test(boardText) && /Total cost: ₹16,20,000/.test(boardText),
      boardText.slice(0, 260)
    );
    record(
      'host: details card has NO Customer line (not in Excel) and Facing —',
      !/Customer:/.test(boardText) && /Facing: —/.test(boardText),
      boardText.slice(0, 260)
    );
    record('host: Book this plot action shown for available plot', /Book this plot/.test(boardText));

    // ---- embedded map canvas: sri-lakshmi tooltip ---------------------------
    const frameHandle = await page.locator('iframe[data-layout-key="sri-lakshmi"]').elementHandle().catch(() => null);
    const mapFrame = frameHandle ? await frameHandle.contentFrame().catch(() => null) : null;
    let tip = null;
    if (mapFrame) tip = await hoverMapPlotByLabel(mapFrame, '1', 'sri-lakshmi');
    record(
      'map: sri-lakshmi tooltip shows real values (Available / 180 / ₹9,000 / ₹16,20,000)',
      !!tip && /avail/i.test(tip) && /180/.test(tip) && /9,000/.test(tip) && /16,20,000/.test(tip),
      tip ? `tip="${tip}"` : 'no tooltip'
    );

    // ---- page error scan -----------------------------------------------------
    record(
      'admin + host pages: no fatal page errors',
      pageErrors.length === 0,
      pageErrors.length ? pageErrors.join(' || ') : 'clean'
    );
  } finally {
    await browser.close();
  }

  // NO restore for sri-lakshmi: real Excel values are the desired end state.
  console.log('\nNOTE: sri-lakshmi deliberately left in the real Excel state (279 plots, rate ₹9,000).');
  console.log(`\n===== SRI REAL-EXCEL UPLOAD VERIFICATION: ${PASS} PASS / ${FAIL} FAIL =====`);
  process.exit(FAIL > 0 ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});