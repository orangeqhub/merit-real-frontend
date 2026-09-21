/* eslint-disable */
// Focused before/after verification of the user-reported issue:
//
//   "While I upload Excel in admin, the data is not reflecting in the main
//    website layout... only those fields should be reflected in both cards
//    and boards which are in the Excel."
//
// Probes, for every registered layout:
//   A. import a row (status=booked, customer, rate, cost, facing) via the
//      real /map/plots/import API
//   B. host board tile + details card on /map-layout/<key> reflect it
//   C. the EMBEDDED MAP canvas reflects it:
//        C1. hover tooltip text  -> "Booked" / rate / cost / customer
//        C2. bottom-right card   -> "Booked" / "MAP REFLECT TEST"
//        C3. polygon fill colour -> booked colour (#FFD54F)
//   D. exact DB restore afterwards
//
// BEFORE the fix: C1/C2/C3 fail on the four DxfCanvas map apps
// (mandira / dokiparru / manjunadha / vinfra) because those apps render
// static geometry-only data; anne/sri already reflect live API data but do
// not show Customer on the hover card.
//
// Requires: backend :3001, frontend :3000 and all six map apps running.
const { chromium } = require("playwright");
const http = require("http");

const CHROME = "C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";
const BASE = "http://localhost:3000";
const API = "http://localhost:3001/api";

const LAYOUTS = [
  { key: "anne-enclave", label: "76", expectedBooked: "#FFD54F" },
  { key: "sri-lakshmi", label: "77", expectedBooked: "#FFD54F" },
  { key: "dokiparru", label: "5", expectedBooked: "#FFD54F" },
  { key: "manjunadha-enclave", label: "41", expectedBooked: "#FFD54F" },
  { key: "vinfra", label: "7", expectedBooked: "#FFD54F" },
  { key: "mandira-developers", label: "3", expectedBooked: "#FFD54F" },
];

const CUSTOMER = "MAP REFLECT TEST";
const RATE = 1234;
const COST = 987600;

let PASS = 0;
let FAIL = 0;
function record(name, ok, detail = "") {
  if (ok) {
    PASS += 1;
    console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    FAIL += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function apiReq(method, pathname, body, token) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const finalPath = pathname.startsWith("/api") ? pathname : `/api${pathname}`;
    const r = http.request(
      {
        host: "localhost",
        port: 3001,
        path: finalPath,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(b); } catch { /* noop */ }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on("error", (e) => resolve({ status: 0, body: { error: e.message } }));
    if (payload) r.write(payload);
    r.end();
  });
}

let TOKEN = null;
async function adminToken() {
  if (TOKEN) return TOKEN;
  const login = await apiReq("POST", "/auth/admin/login", {
    identifier: "admin@merit.com",
    password: "Admin@123",
  });
  TOKEN = login.body?.data?.token || null;
  return TOKEN;
}

async function snapPlot(layout, plotNo) {
  const res = await apiReq(
    "GET",
    `/map/plots/${encodeURIComponent(plotNo)}?layout=${encodeURIComponent(layout)}&plotNo=${encodeURIComponent(plotNo)}`
  );
  const d = res.body?.data;
  if (!d) return null;
  return {
    id: d.externalId || d.id,
    status: d.status,
    customerName: d.customerName || null,
    ratePerSqYd: d.ratePerSqYd != null ? Number(d.ratePerSqYd) : null,
    plotCost: d.plotCost != null ? Number(d.plotCost) : null,
    plotArea: d.plotArea != null ? Number(d.plotArea) : null,
    facing: d.facing || null,
  };
}

async function restorePlot(orig) {
  await apiReq("PATCH", `/map/plots/${encodeURIComponent(orig.id)}/status`, {
    status: orig.status || "available",
    customerName: orig.customerName || null,
  }, TOKEN);
  await apiReq("PATCH", `/map/plots/${encodeURIComponent(orig.id)}/pricing`, {
    id: orig.id,
    plotArea: orig.plotArea,
    ratePerSqYd: orig.ratePerSqYd,
    plotCost: orig.plotCost,
    facing: orig.facing,
  }, TOKEN);
}

// ---------------------------------------------------------------------------
// Map-frame helpers (same contracts as verify-all-layouts.cjs)
// ---------------------------------------------------------------------------
async function plotLabelRect(mapFrame, label) {
  return mapFrame
    .evaluate((target) => {
      const nodes = Array.from(
        document.querySelectorAll("svg text, svg tspan, .leaflet-tooltip, .leaflet-marker-icon")
      );
      const el = nodes.find(
        (n) => (n.textContent || "").trim() === String(target) && n.getClientRects().length
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    }, label)
    .catch(() => null);
}

async function iframeBoxOnScreen(mapFrame, key) {
  const iframeEl = mapFrame.page().locator(`iframe[data-layout-key="${key}"]`);
  await iframeEl
    .evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }))
    .catch(() => {});
  await sleep(500);
  return iframeEl.boundingBox().catch(() => null);
}

async function hoverTargetPoint(mapFrame, label) {
  return mapFrame
    .evaluate((target) => {
      const textEl = Array.from(
        document.querySelectorAll("svg text, svg tspan, .leaflet-marker-icon, .leaflet-tooltip")
      ).find(
        (t) => (t.textContent || "").trim() === String(target) && t.getClientRects().length
      );
      const polys = Array.from(document.querySelectorAll("svg polygon, svg path"));
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
        const t = (el.tagName || "").toLowerCase();
        return t === "polygon" || t === "path";
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
      const divs = Array.from(document.querySelectorAll("div, .leaflet-tooltip"));
      const hits = divs
        .filter((el) => {
          const t = el.textContent || "";
          return /Plot\s*\d/.test(t) && t.includes("Sq.Yds") && t.includes("Status");
        })
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);
      const hit = hits[0];
      return hit ? hit.textContent.replace(/\s+/g, " ").slice(0, 160) : null;
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

async function clickMapPlotByLabel(mapFrame, label, key) {
  const rect = await plotLabelRect(mapFrame, label);
  if (!rect) return false;
  const fbox = await iframeBoxOnScreen(mapFrame, key);
  if (!fbox) return false;
  const page = mapFrame.page();
  await page.mouse.click(fbox.x + rect.x + rect.w / 2, fbox.y + rect.y + rect.h / 2);
  return true;
}

/** All text in the map frame (post-click details card included). */
async function frameBodyText(mapFrame) {
  return mapFrame.evaluate(() => (document.body ? document.body.innerText.replace(/\s+/g, " ") : "")).catch(() => "");
}

/** Normalize a CSS colour to lowercase hex. */
function normalizeColor(value) {
  const v = String(value || "").trim().toLowerCase();
  if (/^#([0-9a-f]{6})$/.test(v)) return v;
  const hexMatch = v.match(/^#([0-9a-f]{3})$/);
  if (hexMatch) {
    return `#${hexMatch[1].split("").map((c) => c + c).join("")}`;
  }
  const rgb = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const toHex = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return v;
}

/** Sample fills of polygon/path elements around a plot label. */
async function fillsNearLabel(mapFrame, label) {
  return mapFrame
    .evaluate((target) => {
      const textEl = Array.from(
        document.querySelectorAll("svg text, svg tspan, .leaflet-marker-icon, .leaflet-tooltip")
      ).find(
        (t) => (t.textContent || "").trim() === String(target) && t.getClientRects().length
      );
      if (!textEl) return [];
      const r = textEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const seen = new Set();
      const fills = [];
      for (let gx = -30; gx <= 30; gx += 6) {
        for (let gy = -30; gy <= 30; gy += 6) {
          const el = document.elementFromPoint(cx + gx, cy + gy);
          if (!el) continue;
          const tag = (el.tagName || "").toLowerCase();
          if (tag !== "polygon" && tag !== "path") continue;
          const fill = el.getAttribute("fill") || (el.style && el.style.fill) || "";
          const norm = String(fill).trim().toLowerCase();
          if (!norm || norm === "none" || norm === "transparent" || seen.has(norm)) continue;
          seen.add(norm);
          fills.push(norm);
        }
      }
      return fills;
    }, label)
    .catch(() => []);
}

// ---------------------------------------------------------------------------
// Main run
// ---------------------------------------------------------------------------
(async () => {
  const token = await adminToken();
  record("admin login", !!token);
  if (!token) { console.log("Aborting — no admin token"); process.exit(1); }

  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const originals = {};

  for (const layout of LAYOUTS) {
    const tag = `${layout.key}(${layout.label})`;
    console.log(`\n--- ${tag} ---`);

    // Snapshot + mutate via the real admin import endpoint.
    const before = await snapPlot(layout.key, layout.label);
    record(`${tag} A0 pre-snapshot`, !!before, before ? `status=${before.status} customer=${before.customerName}` : "no DB row");
    if (!before) continue;
    originals[layout.key] = before;

    const imp = await apiReq("POST", "/map/plots/import", {
      layout: layout.key,
      phase: 1,
      rows: [
        {
          plotNo: layout.label,
          status: "booked",
          customerName: CUSTOMER,
          ratePerSqYd: RATE,
          plotCost: COST,
          facing: "EAST",
        },
      ],
    }, token);
    const impOk = imp.status === 200 && Number(imp.body?.data?.updated) > 0;
    record(`${tag} A1 import updated`, impOk, imp.body?.data ? `updated=${imp.body.data.updated} skipped=${imp.body.data.skipped} err=${(imp.body.data.errors || []).map((e) => e.reason).join(",")}` : `http ${imp.status}`);

    const after = await snapPlot(layout.key, layout.label);
    record(
      `${tag} A2 DB reflects booked+customer`,
      !!after && after.status === "booked" && after.customerName === CUSTOMER,
      after ? `status=${after.status} customer=${after.customerName} rate=${after.ratePerSqYd} cost=${after.plotCost} facing=${after.facing}` : "no row"
    );

    // Public layout page.
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${BASE}/map-layout/${layout.key}`, { waitUntil: "domcontentloaded" }).catch((e) => record(`${tag} B0 page open`, false, e.message));
    await page.waitForSelector(`iframe[data-layout-key="${layout.key}"]`, { timeout: 15000 }).catch(() => {});
    await sleep(3500); // let the embedded map fetch + render

    // Host board + details card control.
    const tile = page
      .locator(`button[title^="${layout.label} "]`)
      .first();
    const tileOk = await tile.isVisible().catch(() => false);
    record(`${tag} B1 board tile visible`, tileOk, tileOk ? `title="${await tile.getAttribute("title").catch(() => "")}"` : "");
    if (tileOk) {
      await tile.click().catch(() => {});
      await sleep(700);
      const detailsText = (await page.locator("body").innerText().catch(() => ""))
        .split("\n")
        .find((l) => l.includes("Plot No:")) || "";
      const detailsBlock = await page
        .evaluate(() => {
          const els = Array.from(document.querySelectorAll("div"));
          const hit = els
            .filter((el) => /Plot No:/.test(el.textContent || ""))
            .sort((a, b) => (b.textContent || "").length - (a.textContent || "").length)[0];
          return hit ? hit.textContent.replace(/\s+/g, " ").slice(0, 300) : "";
        })
        .catch(() => "");
      record(
        `${tag} B2 host details card shows booked+customer`,
        /Status:\s*Booked/i.test(detailsBlock) && detailsBlock.includes(CUSTOMER),
        (detailsBlock || detailsText || "(no details text found)").slice(0, 260)
      );
    }

    // Embedded map canvas checks.
    const frameEl = page.locator(`iframe[data-layout-key="${layout.key}"]`);
    const frameHandle = await frameEl.elementHandle().catch(() => null);
    const mapFrame = frameHandle ? await frameHandle.contentFrame().catch(() => null) : null;
    if (!mapFrame || !tileOk) {
      record(`${tag} C0 map frame ready`, !!mapFrame);
    } else {
      const tip = await hoverMapPlotByLabel(mapFrame, layout.label, layout.key);
      record(
        `${tag} C1 hover tooltip reflects booked`,
        !!tip && /booked/i.test(tip) && tip.includes("1,234"),
        tip ? `tip="${tip}"` : "no tooltip"
      );

      const clicked = await clickMapPlotByLabel(mapFrame, layout.label, layout.key);
      await sleep(900);
      const bodyText = await frameBodyText(mapFrame);
      record(
        `${tag} C2 details card reflects booked+customer`,
        clicked && (/booked/i.test(bodyText)) && bodyText.includes(CUSTOMER),
        bodyText.slice(0, 140) || "no text"
      );
      record(
        `${tag} C3 details card reflects rate+cost`,
        bodyText.includes("1,234") && /cost:\s*₹9,87,600|9,87,600/i.test(bodyText),
        bodyText.slice(0, 140)
      );

      const fills = await fillsNearLabel(mapFrame, layout.label);
      record(
        `${tag} C4 polygon fill = booked colour`,
        fills.includes(layout.expectedBooked) || fills.includes(normalizeColor("rgb(255, 213, 79)")),
        fills.slice(0, 5).join(",") || "no fills"
      );
    }

    await page.close();
  }

  // Restore everything to its true seed state.
  console.log("\n--- restore ---");
  for (const layout of LAYOUTS) {
    const orig = originals[layout.key];
    if (!orig) continue;
    await restorePlot(orig);
    const now = await snapPlot(layout.key, layout.label);
    const ok =
      !!now && now.status === orig.status && now.customerName === orig.customerName &&
      now.ratePerSqYd === orig.ratePerSqYd && now.plotCost === orig.plotCost && now.facing === orig.facing;
    record(`restore ${layout.key}:${layout.label}`, ok, now ? `status=${now.status} customer=${now.customerName} rate=${now.ratePerSqYd} cost=${now.plotCost} facing=${now.facing}` : "no row");
  }

  await browser.close();
  console.log(`\nRESULT: ${PASS} passed, ${FAIL} failed`);
  process.exit(FAIL ? 1 : 0);
})();