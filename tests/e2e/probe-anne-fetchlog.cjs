/* eslint-disable */
const { chromium } = require("playwright");
const CHROME = "C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.addInitScript(() => {
    const origFetch = window.fetch.bind(window);
    window.__fetchLog = [];
    window.fetch = async (...args) => {
      const url = String(args[0] || "");
      const entry = { url: url.slice(0, 140), t0: Date.now(), done: false, ok: null, err: null, status: 0 };
      window.__fetchLog.push(entry);
      const t = origFetch(...args);
      t.then(
        (res) => { entry.done = true; entry.ok = true; entry.status = res.status; entry.ms = Date.now() - entry.t0; },
        (e) => { entry.done = true; entry.ok = false; entry.err = String((e && e.message) || e); entry.ms = Date.now() - entry.t0; }
      );
      return t;
    };
  });
  await page.goto("http://localhost:5174/?embed=1&layout=anne-enclave", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  const log = await page.evaluate(() => window.__fetchLog || []).catch(() => []);
  console.log(JSON.stringify(log, null, 2));
  await browser.close();
})();