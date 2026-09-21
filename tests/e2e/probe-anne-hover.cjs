/* eslint-disable */
const { chromium } = require("playwright");
const CHROME = "C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ["--no-proxy-server", "--proxy-bypass-list=*"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:5174/?embed=1&layout=anne-enclave", { waitUntil: "domcontentloaded" });

  // Time a plain fetch from this page context.
  const t0 = Date.now();
  const f = await page.evaluate(async () => {
    const res = await fetch(
      `http://localhost:3001/api/map/plots?layout=anne-enclave&page=1&pageSize=50&_=${Date.now()}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );
    const j = await res.json();
    const it = (Array.isArray(j?.data?.items) ? j.data.items : []).find((x) => String(x.plotNo) === "76");
    return { status: res.status, plot76: it ? { status: it.status, area: it.plotArea, customerName: it.customerName } : null };
  });
  console.log("plain fetch ms:", Date.now() - t0, JSON.stringify(f));

  await page.waitForTimeout(10000); // let the app's own fetch + merge settle

  async function hover(label) {
    const pt = await page.evaluate((target) => {
      const textEl = Array.from(document.querySelectorAll("svg text, svg tspan, .leaflet-marker-icon, .leaflet-tooltip"))
        .find((t) => (t.textContent || "").trim() === String(target) && t.getClientRects().length);
      if (!textEl) return null;
      const r = textEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, label);
    if (!pt) return "no-label";
    await page.mouse.move(pt.x - 30, pt.y - 30, { steps: 3 });
    await page.mouse.move(pt.x, pt.y, { steps: 4 });
    await sleep(1200);
    const tip = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll("div, .leaflet-tooltip"));
      const hits = divs
        .filter((el) => /Plot\s*\d/.test(el.textContent || "") && (el.textContent || "").includes("Sq.Yds") && (el.textContent || "").includes("Status"))
        .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);
      const hit = hits[0];
      return hit ? hit.textContent.replace(/\s+/g, " ") : null;
    });
    return tip;
  }

  console.log("hover 76 after 10s+ =>", await hover("76"));
  await browser.close();
})();