/* eslint-disable */
// End-to-end verification of the shared plot-selection flow across ALL map
// layouts. Exercises:
//   Flow 1: map click  -> board opens + details shown   (Map -> Board -> Details)
//   Flow 2: board click -> map receives select-plot     (Board -> Map -> Details)
//   Flow 3: search (map box + board box)                (Search -> Map -> Board -> Details)
//   Flow 4: layout switching keeps data isolated
const { chromium } = require('playwright');

const CHROME = 'C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://localhost:3000';

const LAYOUTS = [
  { key: 'anne-enclave', mapLabel: '76', mapLabel2: '75', phases: 2 },
  { key: 'sri-lakshmi', mapLabel: '77', mapLabel2: '3', phases: 1 },
  { key: 'dokiparru', mapLabel: '5', mapLabel2: '8', phases: 1 },
  { key: 'manjunadha-enclave', mapLabel: '41', mapLabel2: '43', phases: 1 },
  { key: 'vinfra', mapLabel: '7', mapLabel2: '8', phases: 1 },
];

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} :: ${name}${detail ? ` :: ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapFrameUrl(page) {
  return page.frames().find((f) => /localhost:(5174|5175|5176|5177|5183)/.test(f.url()));
}

async function gotoAndReady(page, key) {
  await page.goto(`${BASE}/map-layout/${key}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  for (let i = 0; i < 30; i++) {
    const mapFrame = mapFrameUrl(page);
    if (mapFrame) {
      const ok = await mapFrame
        .evaluate(() => document.querySelectorAll('svg polygon, .leaflet-interactive').length > 20)
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

function boardIds(key, phases) {
  return {
    p1: phases === 2 ? `${key}-phase1-board` : `${key}-all-board`,
    p2: phases === 2 ? `${key}-phase2-board` : null,
    search1: phases === 2 ? `board-search-${key}-phase1-board` : `board-search-${key}-all-board`,
  };
}

async function openBoard(page, id) {
  const open = await page
    .$eval(`#${id} [style*="grid-template-rows"]`, (el) =>
      typeof el.style.gridTemplateRows === 'string' ? el.style.gridTemplateRows !== '0fr' : false
    )
    .catch(() => false);
  if (!open) {
    await page.$eval(`#${id} [role="button"]`, (el) => el.click()).catch(() => {});
    await sleep(600);
  }
}

function hostMessageHook(page) {
  return page.evaluate(() => {
    window.__msgs = [];
    const handler = (e) => {
      const d = e.data;
      if (d && typeof d === 'object' && d.type) {
        window.__msgs.push({ type: d.type, plotNo: d.plotNo ?? null, externalId: d.externalId ?? null, query: d.query ?? null });
      }
    };
    window.addEventListener('message', handler);
    window.__hw = handler;
  });
}

function mapMessageHook(mapFrame) {
  return mapFrame
    .evaluate(() => {
      window.__inMsgs = [];
      const h = (e) => {
        const d = e.data;
        if (d && typeof d === 'object' && d.type)
          window.__inMsgs.push({ type: d.type, plotNo: d.plotNo ?? null, externalId: d.externalId ?? null });
      };
      window.addEventListener('message', h);
      window.__mh = h;
    })
    .catch(() => null);
}

async function boardState(page, id) {
  return page
    .$eval(`#${id}`, (el) => {
      const grid = el.querySelector('[style*="grid-template-rows"]');
      const open = grid ? grid.style.gridTemplateRows !== '0fr' : false;
      return {
        open,
        activeTiles: el.querySelectorAll('.ring-2').length,
        hasDetails: /Plot No:/.test(el.innerText),
        tileCount: el.querySelectorAll('button[type="button"]').length,
      };
    })
    .catch(() => null);
}

async function iframePageBox(mapFrame) {
  const port = new URL(mapFrame.url()).port;
  const box = await mapFrame
    .page()
    .locator(`iframe[src*=":${port}"]`)
    .boundingBox()
    .catch(() => null);
  return box;
}

async function clickMapPlotByLabel(mapFrame, label) {
  // Physical click at the plot label's center -- exactly like a user would.
  const rect = await mapFrame
    .evaluate((target) => {
      const nodes = Array.from(
        document.querySelectorAll('svg text, svg tspan, .leaflet-tooltip')
      );
      const el = nodes.find(
        (n) => (n.textContent || '').trim() === String(target) && n.getClientRects().length
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, label)
    .catch(() => null);
  if (!rect) return false;

  // Make sure the map area is on screen, then click at the label's centre.
  const fbox = await iframePageBox(mapFrame);
  if (!fbox) return false;
  const page = mapFrame.page();
  const vp = page.viewportSize();
  const cx = fbox.x + rect.x + rect.w / 2;
  const cy = fbox.y + rect.y + rect.h / 2;
  if (!vp || cx < 0 || cy < 0 || cx > vp.width || cy > vp.height) {
    // Scroll the iframe (or its nearest block) into view and retry once.
    await mapFrame.evaluate(() => {
      const el = document.querySelector('svg, .leaflet-container, .map-viewport');
      if (el) el.scrollIntoView({ block: 'center' });
    });
    await sleep(600);
    const rect2 = await mapFrame
      .evaluate((target) => {
        const nodes = Array.from(
          document.querySelectorAll('svg text, svg tspan, .leaflet-tooltip')
        );
        const el = nodes.find(
          (n) => (n.textContent || '').trim() === String(target) && n.getClientRects().length
        );
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }, label)
      .catch(() => null);
    const fbox2 = await iframePageBox(mapFrame);
    if (!rect2 || !fbox2) return false;
    await page.mouse.click(fbox2.x + rect2.x + rect2.w / 2, fbox2.y + rect2.y + rect2.h / 2);
    return true;
  }
  await page.mouse.click(cx, cy);
  return true;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

  for (const layout of LAYOUTS) {
    const tag = layout.key;
    console.log(`\n########## LAYOUT: ${tag} ##########`);
    const mapFrame = await gotoAndReady(page, tag);
    if (!mapFrame) {
      record(`${tag}: map iframe ready`, false, 'no map frame found');
      continue;
    }
    const ids = boardIds(tag, layout.phases);
    await hostMessageHook(page);
    await mapMessageHook(mapFrame);

    // ---------- Flow 1: map click -> Board -> Details ----------
    {
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      await page.evaluate(() => { window.__msgs = []; });
      const clicked = await clickMapPlotByLabel(mapFrame, layout.mapLabel);
      await sleep(1500);
      const msgs = await page.evaluate(() => window.__msgs || []);
      const select = msgs.find((m) => m.type === 'merit-map-select');
      const s1 = await boardState(page, ids.p1);
      const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
      const anyOpen = (s1 && s1.open) || (s2 && s2.open);
      const anyDetails = (s1 && s1.hasDetails) || (s2 && s2.hasDetails);
      const scrolled = await page.evaluate(() => window.scrollY > 120);
      record(
        `${tag} Flow1 map->board->details`,
        !!(clicked && select && anyOpen && anyDetails),
        `clicked=${clicked} select=${select ? `${select.plotNo}/${select.externalId}` : 'none'} p1open=${s1 && s1.open} p2open=${s2 && s2.open} details=${anyDetails} scroll=${scrolled}`
      );
    }

    // -------- Flow 1b: a SECOND distinct plot on the same map --------
    {
      await page.evaluate(() => { window.__msgs = []; });
      const clicked = await clickMapPlotByLabel(mapFrame, layout.mapLabel2);
      await sleep(1500);
      const msgs = await page.evaluate(() => window.__msgs || []);
      const select = msgs.find((m) => m.type === 'merit-map-select' && m.plotNo === layout.mapLabel2);
      const s1 = await boardState(page, ids.p1);
      const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
      const anyDetails = (s1 && s1.hasDetails) || (s2 && s2.hasDetails);
      record(
        `${tag} Flow1b second distinct plot ${layout.mapLabel2}`,
        !!(clicked && select && anyDetails),
        `clicked=${clicked} select=${select ? `${select.plotNo}/${select.externalId}` : 'none'} details=${anyDetails}`
      );
    }

    // ---------- Flow 2: board click -> Map -> Details ----------
    {
      await mapFrame.evaluate(() => { window.__inMsgs = []; });
      await openBoard(page, ids.p1);
      const tiles = await page
        .$$eval(`#${ids.p1} button[type="button"]`, (els) => els.map((e) => e.textContent.trim()))
        .catch(() => []);
      const pick = tiles.find((t) => /^\d+$/.test(t)) || '';
      record(`${tag} Flow2 board tiles available`, tiles.length > 2, `tiles=${tiles.slice(0, 8).join(',')}`);
      if (pick) {
        await page.click(`#${ids.p1} button[type="button"]:has-text("${pick}")`, { timeout: 8000 });
        await sleep(1100);
        const inMsgs = await mapFrame.evaluate(() => window.__inMsgs || []).catch(() => []);
        const sel = inMsgs.find((m) => m.type === 'merit-map-select-plot');
        const bs = await boardState(page, ids.p1);
        record(
          `${tag} Flow2 board->map->details`,
          !!(sel && bs && bs.activeTiles >= 1 && bs.hasDetails),
          `mapGot=${sel ? `${sel.plotNo}/${sel.externalId}` : 'none'} active=${bs && bs.activeTiles} details=${bs && bs.hasDetails}`
        );
      } else {
        record(`${tag} Flow2 board->map->details`, false, 'no numeric tile found');
      }
    }

    // ---------- Flow 3a: map's own search box -> Board -> Details ----------
    {
      await page.evaluate(() => { window.__msgs = []; });
      const box = mapFrame.locator('input[placeholder*="Search Plot"]');
      if (await box.count()) {
        await box.fill(layout.mapLabel);
        await box.press('Enter');
        await sleep(1400);
        const msgs = await page.evaluate(() => window.__msgs || []);
        const gotSelect = msgs.some((m) => m.type === 'merit-map-select');
        const gotSearch = msgs.some((m) => m.type === 'merit-map-search');
        const s1 = await boardState(page, ids.p1);
        const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
        const anyOpen = (s1 && s1.open) || (s2 && s2.open);
        const anyDetails = (s1 && s1.hasDetails) || (s2 && s2.hasDetails);
        record(
          `${tag} Flow3a map search`,
          !!(gotSelect && anyOpen),
          `select=${gotSelect} search=${gotSearch} p1open=${s1 && s1.open} details=${anyDetails}`
        );
        await box.fill('');
        await box.press('Enter');
      } else {
        record(`${tag} Flow3a map search`, false, 'no search box in map');
      }
    }

    // ---------- Flow 3b: board search -> Map -> Board -> Details ----------
    {
      await mapFrame.evaluate(() => { window.__inMsgs = []; });
      await openBoard(page, ids.p1);
      // Search a different plot than the map-search one from Flow3a -- filling
      // an unchanged value would not fire React's onChange.
      const target = layout.mapLabel === '1' ? '2' : '1';
      await page.fill(`#${ids.search1}`, '');
      await sleep(350);
      await page.fill(`#${ids.search1}`, target);
      await sleep(1200);
      const inMsgs = await mapFrame.evaluate(() => window.__inMsgs || []).catch(() => []);
      const typeMsgs = inMsgs.filter((m) => m.type === 'merit-map-select-plot');
      const sel = [...typeMsgs].reverse().find((m) => m.plotNo != null) || null;
      const bs = await boardState(page, ids.p1);
      record(
        `${tag} Flow3b board search`,
        !!(sel && bs && bs.hasDetails && sel.plotNo === target),
        `search=${target} mapGot=${sel ? `${sel.plotNo}/${sel.externalId}` : 'none'} all=${inMsgs.map((m) => m.type + ':' + m.plotNo).join('|')} details=${bs && bs.hasDetails}`
      );
    }
  }

  // ---------- Flow 4: layout-switch isolation ----------
  console.log(`\n########## LAYOUT SWITCH ISOLATION ##########`);
  {
    await gotoAndReady(page, 'anne-enclave');
    const mapA = mapFrameUrl(page);
    await hostMessageHook(page);
    await mapMessageHook(mapA);
    await openBoard(page, 'anne-enclave-phase1-board');
    await page.fill('#board-search-anne-enclave-phase1-board', '22');
    await sleep(800);
    const seeded = await page.$eval('#anne-enclave-phase1-board', (el) => ({
      active: el.querySelectorAll('.ring-2').length,
      details: /Plot No:/.test(el.innerText),
      search: document.querySelector('#board-search-anne-enclave-phase1-board').value,
    }));
    record('Flow4 seed anne selection', seeded.active >= 1 && seeded.details, JSON.stringify(seeded));

    // Message-source guard: a fake message dispatched from the PAGE itself (not
    // from the map iframe) must be ignored by the host board.
    await page.evaluate(() =>
      window.postMessage({ type: 'merit-map-select', externalId: 'p-0', plotNo: '1' }, '*')
    );
    await sleep(600);
    const guard = await page.$eval('#anne-enclave-phase1-board', (el) => ({
      active: el.querySelectorAll('.ring-2').length,
      details: /Plot No:/.test(el.innerText),
    }));
    record(
      'Flow4 message-source guard rejects non-iframe messages',
      guard.active === 1 && guard.details,
      JSON.stringify(guard)
    );

    // Switch to sri-lakshmi via the SPA router (All layouts -> card).
    await page.click('text=All layouts', { timeout: 8000 }).catch(async () => {
      await page.goto(`${BASE}/map-layouts`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });
    await sleep(1200);
    await page.click('a[href="/map-layout/sri-lakshmi"]', { timeout: 10000 }).catch(() => {});
    await sleep(5000);
    const sriState = await page.evaluate(() => {
      const board = document.querySelector('#sri-lakshmi-all-board');
      return {
        active: board ? board.querySelectorAll('.ring-2').length : -1,
        hasDetails: board ? /Plot No:/.test(board.innerText) : -1,
        searchVal: document.querySelector('#board-search-sri-lakshmi-all-board')?.value ?? null,
      };
    });
    record(
      'Flow4 no anne leak into sri-lakshmi',
      sriState.active === 0 && sriState.hasDetails === false && (sriState.searchVal === '' || sriState.searchVal === null),
      JSON.stringify(sriState)
    );

    // Select a plot in sri-lakshmi, then go back to anne-enclave: must be clean.
    const mapB = mapFrameUrl(page);
    await hostMessageHook(page);
    await mapMessageHook(mapB);
    await openBoard(page, 'sri-lakshmi-all-board');
    await page
      .click('#sri-lakshmi-all-board button[type="button"]:has-text("77")', { timeout: 8000 })
      .catch(() => {});
    await sleep(800);
    await gotoAndReady(page, 'anne-enclave');
    const anneBack = await page.evaluate(() => {
      const b = document.querySelector('#anne-enclave-phase1-board');
      const b2 = document.querySelector('#anne-enclave-phase2-board');
      return {
        active1: b ? b.querySelectorAll('.ring-2').length : -1,
        active2: b2 ? b2.querySelectorAll('.ring-2').length : -1,
        details1: b ? /Plot No:/.test(b.innerText) : -1,
        details2: b2 ? /Plot No:/.test(b2.innerText) : -1,
        search1: document.querySelector('#board-search-anne-enclave-phase1-board')?.value ?? null,
      };
    });
    record(
      'Flow4 no sri-lakshmi leak into anne-enclave',
      anneBack.active1 === 0 &&
        anneBack.active2 === 0 &&
        !anneBack.details1 &&
        !anneBack.details2 &&
        (anneBack.search1 === '' || anneBack.search1 === null),
      JSON.stringify(anneBack)
    );
  }

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n========== SUMMARY: ${results.length - failed.length}/${results.length} passed ==========`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ' :: ' + f.detail : ''}`));
    process.exit(1);
  }
  console.log('ALL FLOWS VERIFIED');
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});