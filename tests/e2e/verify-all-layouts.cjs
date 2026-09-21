/* eslint-disable */
// End-to-end verification of the interactive map-layout workflow across ALL
// registered layouts (Anne Enclave, Sri Lakshmi, Dokiparru, Manjunadha
// Enclave, Vinfra, Mandira Developers).
//
// Covers the acceptance checklist:
//   1. map loads          6. board highlight       11. booking ("Book this plot")
//   2. plot count         7. board sync            12. layout-switch clears selection
//   3. board renders      8. details card          13. no data leak between layouts
//   4. hover tooltip      9. search                14. Anne Enclave unchanged (2 phases)
//   5. map click         10. board click -> map    15. responsive (mobile)
//
// Requires: backend :3001, frontend :3000 and all 6 map apps running locally.
const { chromium } = require('playwright');

const CHROME = 'C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const BASE = 'http://localhost:3000';
const PORTS = [5174, 5175, 5176, 5177, 5183, 5184];

const LAYOUTS = [
  { key: 'anne-enclave',  clicks: ['76', '75'], phases: 2, displayCount: 272, p1: 134, p2: 138, dbCount: 272, extPrefix: 'p-',  prop: 'Sky line Infra Anne Enclave' },
  { key: 'sri-lakshmi',   clicks: ['77', '3'],  phases: 1, displayCount: 279,       dbCount: 279, extPrefix: 'sl-', prop: 'Map Sri Lakshmi Residency' },
  { key: 'dokiparru',     clicks: ['5', '8'],   phases: 1, displayCount: 378,       dbCount: 378, extPrefix: 'dk-', prop: 'Elite Sky City' },
  { key: 'manjunadha-enclave', clicks: ['41', '43'], phases: 1, displayCount: 68,   dbCount: 67,  extPrefix: 'manjunadha-', prop: 'Manjunadha Enclave' },
  { key: 'vinfra',        clicks: ['7', '8'],   phases: 1, displayCount: 196,       dbCount: 196, extPrefix: 'vinfra-', prop: 'V Infra ORR Nandana Vanam @ Saripudi' },
  { key: 'mandira-developers', clicks: ['3', '8'], phases: 1, displayCount: 193,    dbCount: 193, extPrefix: 'mnd-', prop: 'Mandira Developers' },
];

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} :: ${name}${detail ? ` :: ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapFrameUrl(page) {
  return page.frames().find((f) => /localhost:(5174|5175|5176|5177|5183|5184)/.test(f.url()));
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
        window.__msgs.push({ type: d.type, plotNo: d.plotNo ?? null, externalId: d.externalId ?? null, query: d.query ?? null, count: d.count ?? null });
      }
    };
    window.addEventListener('message', handler);
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
        text: el.innerText.slice(0, 220),
      };
    })
    .catch(() => null);
}

/** Locate a plot label inside the map frame and return its viewport rect. */
async function plotLabelRect(mapFrame, label) {
  return mapFrame
    .evaluate((target) => {
      const nodes = Array.from(
        document.querySelectorAll('svg text, svg tspan, .leaflet-tooltip, .leaflet-marker-icon')
      );
      const el = nodes.find(
        (n) => (n.textContent || '').trim() === String(target) && n.getClientRects().length
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, label)
    .catch(() => null);
}

/**
 * Scroll the host page so the map iframe's vertical middle sits at the
 * viewport centre, then return the iframe's (re-measured) page box. The map
 * contained in the iframe often starts below the fold (y ~700+), so raw
 * mouse coordinates computed from iframe-local rects land off-viewport and
 * events never reach the map. Bring the iframe on-screen first.
 */
async function iframeBoxOnScreen(mapFrame) {
  const port = new URL(mapFrame.url()).port;
  const iframeEl = mapFrame.page().locator(`iframe[src*=":${port}"]`);
  await iframeEl
    .evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }))
    .catch(() => {});
  await sleep(500);
  return iframeEl.boundingBox().catch(() => null);
}

/**
 * Find a point (in iframe-local coordinates) whose hit-test lands on a plot
 * polygon/path near the given label. Picks the smallest polygon bbox that
 * contains the label centre, then samples elementFromPoint until the cursor
 * is over an actual shape (the label centre itself can fall on an overlay
 * polygon, and a polygon's bbox centre can fall outside a concave shape).
 */
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
            left: pr.left,
            top: pr.top,
            right: pr.right,
            bottom: pr.bottom,
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
      for (const c of cands.slice(0, 4)) {
        points.push([(c.left + c.right) / 2, (c.top + c.bottom) / 2]);
      }
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

/** Move the host-page mouse over an iframe-local point (scrolling as needed). */
async function moveMouseOver(mapFrame, pt) {
  const fbox = await iframeBoxOnScreen(mapFrame);
  if (!fbox) return false;
  const page = mapFrame.page();
  const cx = fbox.x + pt.x;
  const cy = fbox.y + pt.y;
  await page.mouse.move(cx - 40, cy - 40, { steps: 4 });
  await page.mouse.move(cx, cy, { steps: 6 });
  return true;
}

async function clickMapPlotByLabel(mapFrame, label, dy = 0) {
  const rect = await plotLabelRect(mapFrame, label);
  if (!rect) return false;
  const fbox = await iframeBoxOnScreen(mapFrame);
  if (!fbox) return false;
  const page = mapFrame.page();
  await page.mouse.click(fbox.x + rect.x + rect.w / 2, fbox.y + rect.y + rect.h / 2 + dy);
  return true;
}

/** Probe for the plot tooltip inside the map frame (fixed div or leaflet tooltip). */
async function tooltipText(mapFrame) {
  return mapFrame
    .evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, .leaflet-tooltip'));
      const hits = divs
        .filter((el) => {
          const t = el.textContent || '';
          return /Plot\s*\d/.test(t) && t.includes('Sq.Yds');
        })
        .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
      const hit = hits[0];
      return hit ? hit.textContent.replace(/\s+/g, ' ').slice(0, 80) : null;
    })
    .catch(() => null);
}

/**
 * Hover over a plot (targets an on-shape sample point near the label — the
 * label centre can fall on an overlapping overlay polygon) and probe for the
 * tooltip. Retries with a fresh measurement each round because the initial
 * fit-to-plot camera animation can outlast the settle in some runs, drifting
 * the polygon away from the mouse.
 */
async function hoverMapPlotByLabel(mapFrame, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pt = await hoverTargetPoint(mapFrame, label);
    if (!pt) return false;
    const moved = await moveMouseOver(mapFrame, pt);
    if (!moved) return false;
    await sleep(900);
    const tipText = await tooltipText(mapFrame);
    if (tipText) return tipText;
    await sleep(1200); // let the camera settle before re-measuring
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main run
// ---------------------------------------------------------------------------
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
    const dbg = `${new URL(mapFrame.url()).port}/${mapFrame.url().split('?')[1] || ''}`;

    // ---------- F0: map loads (polygons present) + plot count ----------
    {
      const polyCount = await mapFrame
        .evaluate(() => document.querySelectorAll('svg polygon, .leaflet-overlay-pane path').length)
        .catch(() => 0);
      const p1Text = await page.$eval(`#${ids.p1}`, (el) => el.innerText).catch(() => '');
      const p2Text = ids.p2 ? await page.$eval(`#${ids.p2}`, (el) => el.innerText).catch(() => '') : '';
      // Board count: anne shows phase-split synced totals ("134 of 134 …", "138 of 138 …");
      // single-phase boards show the map-verified total ("All plots (N)" / "N plots").
      const countOk = layout.phases === 2
        ? new RegExp(`${layout.p1} of ${layout.p1} plots synced`).test(p1Text) &&
          new RegExp(`${layout.p2} of ${layout.p2} plots synced`).test(p2Text)
        : new RegExp(`All plots \\(${layout.displayCount}\\)`).test(p1Text) ||
          new RegExp(` ${layout.displayCount} plots`).test(p1Text);
      record(
        `${tag} F0 map loads + count`,
        polyCount > 20 && countOk,
        `polygons=${polyCount} board1="${(p1Text || '').replace(/\s+/g, ' ').slice(0, 70)}" board2="${(p2Text || '').replace(/\s+/g, ' ').slice(0, 40)}" frame=${dbg}`
      );
    }

    // ---------- F0b: board renders ----------
    {
      await openBoard(page, ids.p1);
      const s1 = await boardState(page, ids.p1);
      const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
      const totalTiles = (s1 ? s1.tileCount : 0) + (s2 ? s2.tileCount : 0);
      record(
        `${tag} F0b board rendered`,
        !!s1 && s1.open && totalTiles > 20,
        `p1open=${s1 && s1.open} p1tiles=${s1 && s1.tileCount} p2tiles=${s2 && s2.tileCount}`
      );
    }

    // ---------- F1: hover shows plot tooltip ----------
    {
      const tip = await hoverMapPlotByLabel(mapFrame, layout.clicks[0]);
      record(`${tag} F1 hover tooltip`, !!tip, tip ? `tip="${tip.replace(/\n/g, ' | ')}"` : 'no tooltip');
      // Move away so later flows start clean
      await mapFrame.page().mouse.move(10, 10, { steps: 3 });
      await sleep(400);
    }

    // ---------- F2: map click -> board highlight + details ----------
    {
      await page.evaluate(() => { window.__msgs = []; });
      // Reset board selection state by navigating away selection via a fresh click target
      const clickAndWatch = async () => {
        const clicked = await clickMapPlotByLabel(mapFrame, layout.clicks[0]);
        await sleep(1800);
        const msgs = await page.evaluate(() => window.__msgs || []);
        return { clicked, msgs };
      };
      let { clicked, msgs } = await clickAndWatch();
      if (clicked && !msgs.some((m) => m.type === 'merit-map-select')) {
        // camera may still be settling from a previous pan/zoom: retry once
        await sleep(1200);
        ({ clicked, msgs } = await clickAndWatch());
      }
      const select = msgs.find((m) => m.type === 'merit-map-select');
      const s1 = await boardState(page, ids.p1);
      const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
      const anyOpen = (s1 && s1.open) || (s2 && s2.open);
      const anyActive = (s1 ? s1.activeTiles : 0) + (s2 ? s2.activeTiles : 0) >= 1;
      const anyDetails = (s1 && s1.hasDetails) || (s2 && s2.hasDetails);
      record(
        `${tag} F2 map click -> board highlight + details`,
        !!(clicked && select && anyOpen && anyActive && anyDetails),
        `clicked=${clicked} select=${select ? `${select.plotNo}/${select.externalId}` : 'none'} open=${anyOpen} active=${anyActive} details=${anyDetails}`
      );
    }

    // ---------- F2b: second distinct plot ----------
    {
      // Anne's map fly-to-animates to the F2-selected plot; the label of the
      // next click moves while the camera runs. Let it settle before measuring.
      if (layout.phases === 2) await sleep(2500);
      const clickAndWatch = async (attempt) => {
        await page.evaluate(() => { window.__msgs = []; });
        const dy = ((attempt % 3) - 1) * 6; // 0, +6, -6 -> hit polygon even on label edges
        const clicked = await clickMapPlotByLabel(mapFrame, layout.clicks[1], dy);
        await sleep(1800);
        const msgs = await page.evaluate(() => window.__msgs || []);
        return { clicked, msgs };
      };
      let attempt = 0;
      let { clicked, msgs } = await clickAndWatch(attempt);
      while (
        attempt < 3 &&
        clicked &&
        !msgs.some((m) => m.type === 'merit-map-select' && String(m.plotNo) === layout.clicks[1])
      ) {
        attempt++;
        await sleep(2500);
        ({ clicked, msgs } = await clickAndWatch(attempt));
      }
      const select = msgs.find(
        (m) => m.type === 'merit-map-select' && String(m.plotNo) === layout.clicks[1]
      );
      const s1 = await boardState(page, ids.p1);
      const s2 = ids.p2 ? await boardState(page, ids.p2) : null;
      const anyDetails = (s1 && s1.hasDetails) || (s2 && s2.hasDetails);
      record(
        `${tag} F2b second distinct plot ${layout.clicks[1]}`,
        !!(clicked && select && anyDetails),
        `clicked=${clicked} select=${select ? `${select.plotNo}/${select.externalId}` : 'none'} details=${anyDetails}`
      );
    }

    // ---------- F3: board click -> map receives select-plot ----------
    {
      await mapFrame.evaluate(() => { window.__inMsgs = []; });
      await openBoard(page, ids.p1);
      const tiles = await page
        .$$eval(`#${ids.p1} button[type="button"]`, (els) => els.map((e) => e.textContent.trim()).filter((t) => /^\d+$/.test(t)))
        .catch(() => []);
      const pick = tiles[0] || '';
      record(`${tag} F3 board tiles available`, tiles.length > 2, `tiles=${tiles.slice(0, 8).join(',')}`);
      if (pick) {
        await page.click(`#${ids.p1} button[type="button"]:has-text("${pick}")`, { timeout: 8000 });
        await sleep(1200);
        const inMsgs = await mapFrame.evaluate(() => window.__inMsgs || []).catch(() => []);
        const sel = inMsgs.find((m) => m.type === 'merit-map-select-plot');
        const bs = await boardState(page, ids.p1);
        record(
          `${tag} F3 board click -> map sync + details`,
          !!(sel && bs && bs.activeTiles >= 1 && bs.hasDetails),
          `mapGot=${sel ? `${sel.plotNo}/${sel.externalId}` : 'none'} active=${bs && bs.activeTiles} details=${bs && bs.hasDetails}`
        );
      } else {
        record(`${tag} F3 board click -> map sync + details`, false, 'no numeric tile found');
      }
    }

    // ---------- F4: map's own search box ----------
    {
      await page.evaluate(() => { window.__msgs = []; });
      const box = mapFrame.locator('input[placeholder*="Search Plot"]');
      if (await box.count()) {
        await box.fill(layout.clicks[0]);
        await box.press('Enter');
        await sleep(1500);
        const msgs = await page.evaluate(() => window.__msgs || []);
        const gotSelect = msgs.some((m) => m.type === 'merit-map-select');
        const gotSearch = msgs.some((m) => m.type === 'merit-map-search');
        const s1 = await boardState(page, ids.p1);
        record(
          `${tag} F4 map search`,
          !!(gotSelect && s1 && s1.open),
          `select=${gotSelect} search=${gotSearch} open=${s1 && s1.open} details=${s1 && s1.hasDetails}`
        );
        await box.fill('');
        await box.press('Enter');
      } else {
        record(`${tag} F4 map search`, false, 'no search box in map');
      }
    }

    // ---------- F5: board search -> map receives select-plot ----------
    {
      await mapFrame.evaluate(() => { window.__inMsgs = []; });
      await openBoard(page, ids.p1);
      const target = layout.clicks[1];
      await page.fill(`#${ids.search1}`, '');
      await sleep(350);
      await page.fill(`#${ids.search1}`, target);
      await sleep(1200);
      const inMsgs = await mapFrame.evaluate(() => window.__inMsgs || []).catch(() => []);
      const sel = [...inMsgs].reverse().find((m) => m.type === 'merit-map-select-plot' && m.plotNo != null) || null;
      const bs = await boardState(page, ids.p1);
      record(
        `${tag} F5 board search -> map`,
        !!(sel && bs && bs.hasDetails),
        `search=${target} mapGot=${sel ? `${sel.plotNo}/${sel.externalId}` : 'none'} all=${inMsgs.map((m) => m.type + ':' + m.plotNo).join('|')} details=${bs && bs.hasDetails}`
      );
    }

    // ---------- F6: "Book this plot" wiring (logged-out => login + pending path) ----------
    {
      await page.evaluate(() => sessionStorage.clear());
      await openBoard(page, ids.p1);
      await page.fill(`#${ids.search1}`, '');
      await sleep(300);
      await page.fill(`#${ids.search1}`, '1');
      await sleep(900);
      const bookBtn = page.locator(`#${ids.p1} button:has-text("Book this plot")`);
      const hasBtn = await bookBtn.count().catch(() => 0);
      if (!hasBtn) {
        record(`${tag} F6 book works`, false, 'no Book this plot button on plot 1 (not saleable?)');
      } else {
        await Promise.all([
          page.waitForURL(/\/login/, { timeout: 12000 }).catch(() => null),
          bookBtn.first().click({ timeout: 8000 }),
        ]);
        await sleep(800);
        const url = page.url();
        const pending = await page.evaluate(() => sessionStorage.getItem('pending_book_plot')).catch(() => null);
        const okPending = pending && pending.startsWith('/book-plot/');
        const realExt = okPending && !/\/book-plot\/\d+$/.test(pending) && new RegExp(`/book-plot/[^/]*${layout.extPrefix}`).test(pending);
        record(
          `${tag} F6 book redirects to login + layout-scoped pending plot`,
          /\/login/.test(url) && okPending && realExt,
          `url=${url} pending=${pending || 'null'}`
        );
        await page.goto(`${BASE}/map-layout/${tag}`, { waitUntil: 'domcontentloaded', timeout: 40000 });
        await gotoAndReady(page, tag);
      }
    }

    // ---------- Anne-only: phase 2 board flow (board-driven) ----------
    // The phase-2 map labels only render in the phase-2 view, so drive this from
    // the real phase-2 board: clicking tile "16" must post merit-map-select-plot
    // (16/p-150) into the map and light up the phase-2 details card.
    if (layout.phases === 2) {
      const tile = '16';
      const mapFrame2 = mapFrameUrl(page);
      if (!mapFrame2) {
        record(`${tag} phase2 board flow`, false, 'no map frame after F6 nav');
      } else {
        await mapMessageHook(mapFrame2);
        await openBoard(page, ids.p2);
        const clicked = await page
          .$$eval(`#${ids.p2} button[type="button"]`, (els) => {
            const btn = els.find((e) => e.textContent.trim() === '16');
            if (btn) btn.click();
            return !!btn;
          })
          .catch(() => false);
        await sleep(1500);
        const inMsgs = await mapFrame2.evaluate(() => window.__inMsgs || []).catch(() => []);
        const sel = inMsgs.find((m) => m.type === 'merit-map-select-plot' && String(m.plotNo) === tile);
        const s2 = await boardState(page, ids.p2);
        const p2Details = s2 && (s2.hasDetails || /Plot No:/.test(s2.text || ''));
        record(
          `${tag} phase2 board flow`,
          !!(clicked && sel && s2 && s2.open && s2.activeTiles >= 1 && p2Details),
          `clicked=${clicked} mapGot=${sel ? `${sel.plotNo}/${sel.externalId}` : 'none'} p2open=${s2 && s2.open} p2active=${s2 && s2.activeTiles} p2details=${p2Details}`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Flow 7: layout-switch isolation + message-source guard
  // -------------------------------------------------------------------------
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
    record('F7 seed anne selection', seeded.active >= 1 && seeded.details, JSON.stringify(seeded));

    await page.evaluate(() =>
      window.postMessage({ type: 'merit-map-select', externalId: 'p-0', plotNo: '1' }, '*')
    );
    await sleep(600);
    const guard = await page.$eval('#anne-enclave-phase1-board', (el) => ({
      active: el.querySelectorAll('.ring-2').length,
      details: /Plot No:/.test(el.innerText),
    }));
    record(
      'F7 message-source guard rejects non-iframe messages',
      guard.active === seeded.active && guard.details === seeded.details,
      JSON.stringify(guard)
    );

    await page.goto(`${BASE}/map-layout/sri-lakshmi`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(4500);
    const sriState = await page.evaluate(() => {
      const board = document.querySelector('#sri-lakshmi-all-board');
      return {
        active: board ? board.querySelectorAll('.ring-2').length : -1,
        hasDetails: board ? /Plot No:/.test(board.innerText) : -1,
        searchVal: document.querySelector('#board-search-sri-lakshmi-all-board')?.value ?? null,
      };
    });
    record(
      'F7 no anne leak into sri-lakshmi',
      sriState.active === 0 && sriState.hasDetails === false && (sriState.searchVal === '' || sriState.searchVal === null),
      JSON.stringify(sriState)
    );

    // Select in sri-lakshmi, then back to anne: must be clean.
    const mapB = mapFrameUrl(page);
    await hostMessageHook(page);
    await mapMessageHook(mapB);
    await openBoard(page, 'sri-lakshmi-all-board');
    await page.click('#sri-lakshmi-all-board button[type="button"]:has-text("77")', { timeout: 8000 }).catch(() => {});
    await sleep(800);
    await gotoAndReady(page, 'anne-enclave');
    const anneBack = await page.evaluate(() => {
      const b = document.querySelector('#anne-enclave-phase1-board');
      const b2 = document.querySelector('#anne-enclave-phase2-board');
      return {
        active1: b ? b.querySelectorAll('.ring-2').length : -1,
        active2: b2 ? b.querySelectorAll('.ring-2').length : -1,
        details1: b ? /Plot No:/.test(b.innerText) : -1,
        details2: b2 ? /Plot No:/.test(b2.innerText) : -1,
        search1: document.querySelector('#board-search-anne-enclave-phase1-board')?.value ?? null,
      };
    });
    record(
      'F7 no sri-lakshmi leak into anne-enclave',
      anneBack.active1 === 0 && anneBack.active2 === 0 && !anneBack.details1 && !anneBack.details2 && (anneBack.search1 === '' || anneBack.search1 === null),
      JSON.stringify(anneBack)
    );

    // vinfra: board must show only its own 196 plots (tile count + title),
    // never another layout's plot data.
    await gotoAndReady(page, 'vinfra');
    const mapV = mapFrameUrl(page);
    await hostMessageHook(page);
    await mapMessageHook(mapV);
    await openBoard(page, 'vinfra-all-board');
    const vinState = await page.evaluate(() => {
      const board = document.querySelector('#vinfra-all-board');
      const title = board ? board.querySelector('h3')?.innerText || '' : '';
      const tiles = board ? board.querySelectorAll('button[type="button"]').length : -1;
      return { title, tiles };
    });
    record(
      'F7 vinfra board shows all 196 of its own plots',
      vinState.tiles === 196 && /All plots \(196\)/.test(vinState.title),
      `tiles=${vinState.tiles} title="${vinState.title}"`
    );

    // mandira: details must reference mnd- externalId in the booking resume path
    await gotoAndReady(page, 'mandira-developers');
    const mapM = mapFrameUrl(page);
    await hostMessageHook(page);
    await mapMessageHook(mapM);
    await openBoard(page, 'mandira-developers-all-board');
    await page.fill('#board-search-mandira-developers-all-board', '1');
    await sleep(1000);
    const bookBtn = page.locator('#mandira-developers-all-board button:has-text("Book this plot")');
    if (await bookBtn.count()) {
      await Promise.all([
        page.waitForURL(/\/login/, { timeout: 12000 }).catch(() => null),
        bookBtn.first().click({ timeout: 8000 }),
      ]);
      await sleep(600);
      const pending = await page.evaluate(() => sessionStorage.getItem('pending_book_plot')).catch(() => null);
      record(
        'F7 mandira book resolves to mnd- row (no numeric-id leak)',
        !!pending && /\/book-plot\/[^/]*mnd-/.test(pending),
        `pending=${pending || 'null'}`
      );
    } else {
      record('F7 mandira book resolves to mnd- row (no numeric-id leak)', false, 'no book button for plot 1');
    }
  }

  // -------------------------------------------------------------------------
  // Flow 8: responsive — mobile viewport
  // -------------------------------------------------------------------------
  console.log(`\n########## RESPONSIVE (MOBILE 390x844) ##########`);
  {
    const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mob.on('pageerror', (e) => console.log('[mob pageerror]', String(e).slice(0, 200)));
    await mob.goto(`${BASE}/map-layout/vinfra`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    let ready = false;
    for (let i = 0; i < 40; i++) {
      const mf = mob.frames().find((f) => /localhost:5177/.test(f.url()));
      ready = !!(mf && mf.evaluate(() => document.querySelectorAll('svg polygon, .leaflet-overlay-pane path').length > 20).catch(() => false));
      if (ready) break;
      await sleep(1500);
    }
    await sleep(1200);
    const overflow = await mob.evaluate(() => {
      const s = document.scrollingElement || document.documentElement;
      return { scrollW: s.scrollWidth, clientW: s.clientWidth };
    });
    await openBoard(mob, 'vinfra-all-board');
    await mob.fill('#board-search-vinfra-all-board', '7');
    await sleep(1000);
    const mobState = await mob.evaluate(() => {
      const board = document.querySelector('#vinfra-all-board');
      return { active: board ? board.querySelectorAll('.ring-2').length : -1, details: board ? /Plot No:/.test(board.innerText) : false };
    });
    record(
      'F8 mobile: map loads, no horizontal overflow, board works',
      ready && overflow.scrollW <= overflow.clientW + 2 && mobState.active >= 1 && mobState.details,
      `ready=${ready} scrollW=${overflow.scrollW} clientW=${overflow.clientW} active=${mobState.active} details=${mobState.details}`
    );

    // Mobile on anne (two-phase) as well
    await mob.goto(`${BASE}/map-layout/anne-enclave`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    let ready2 = false;
    for (let i = 0; i < 40; i++) {
      const mf = mob.frames().find((f) => /localhost:5174/.test(f.url()));
      ready2 = !!(mf && mf.evaluate(() => document.querySelectorAll('svg polygon').length > 20).catch(() => false));
      if (ready2) break;
      await sleep(1500);
    }
    await sleep(1200);
    const overflow2 = await mob.evaluate(() => {
      const s = document.scrollingElement || document.documentElement;
      return { scrollW: s.scrollWidth, clientW: s.clientWidth };
    });
    await openBoard(mob, 'anne-enclave-phase1-board');
    await mob.fill('#board-search-anne-enclave-phase1-board', '22');
    await sleep(1000);
    const mobAnne = await mob.evaluate(() => {
      const board = document.querySelector('#anne-enclave-phase1-board');
      return { active: board ? board.querySelectorAll('.ring-2').length : -1, details: board ? /Plot No:/.test(board.innerText) : false };
    });
    record(
      'F8 mobile anne: map loads, no horizontal overflow, board works',
      ready2 && overflow2.scrollW <= overflow2.clientW + 2 && mobAnne.active >= 1 && mobAnne.details,
      `ready=${ready2} scrollW=${overflow2.scrollW} clientW=${overflow2.clientW} active=${mobAnne.active} details=${mobAnne.details}`
    );
    await mob.close();
  }

  // -------------------------------------------------------------------------
  // API data isolation (belt & braces)
  // -------------------------------------------------------------------------
  console.log(`\n########## API ISOLATION ##########`);
  {
    const http = require('http');
    const get = (u) => new Promise((res) => {
      http.get(u, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(b)); }).on('error', () => res(''));
    });
    for (const layout of LAYOUTS) {
      const key = layout.key;
      const body = await get(`http://localhost:3001/api/map/plots?layout=${key}&pageSize=500`);
      let data = null;
      try { data = JSON.parse(body).data; } catch { /* noop */ }
      const rows = Array.isArray(data?.items) ? data.items : [];
      const foreign = rows.filter((r) => r.layoutKey && r.layoutKey !== key).length;
      const expected = layout.dbCount;
      record(
        `API ${key} isolated + tally`,
        rows.length === expected && foreign === 0,
        `rows=${rows.length} expectedDb=${expected} foreign=${foreign}`
      );
    }
  }

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n========== SUMMARY: ${results.length - failed.length}/${results.length} passed ==========`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ' :: ' + f.detail : ''}`));
    process.exit(1);
  }
  console.log('ALL LAYOUTS VERIFIED');
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});