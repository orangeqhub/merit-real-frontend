/* eslint-disable */
// Probe: inside the anne map app (5174, embedded view), run the SAME fetch the
// app would run and report what the API returns (status field per item), plus
// check the actual network result of the app's own service call if reachable.
const { chromium } = require("playwright");

const CHROME = "C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto("http://localhost:5174/?embed=1&layout=anne-enclave", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);

  const probe = await page.evaluate(async () => {
    const out = { fetchStatus: 0, items: [], error: "" };
    try {
      const res = await fetch(
        `http://localhost:3001/api/map/plots?layout=anne-enclave&page=1&pageSize=50&_=${Date.now()}`,
        { cache: "no-store", headers: { Accept: "application/json" } }
      );
      out.fetchStatus = res.status;
      const json = await res.json();
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];
      out.items = items.slice(0, 3).map((it) => ({
        plotNo: it.plotNo,
        status: it.status,
        customerName: it.customerName,
      }));
    } catch (e) {
      out.error = String(e && e.message ? e.message : e);
    }
    return out;
  });
  console.log("in-page fetch:", JSON.stringify(probe, null, 2));

  await browser.close();
})();