/* eslint-disable */
const { chromium } = require("playwright");
const CHROME = "C:\\Users\\komma\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const log = [];
  page.on("request", (req) => {
    if (req.url().includes("/map/plots")) log.push({ e: "req", u: req.url().slice(0, 150) });
  });
  page.on("requestfailed", (req) => {
    if (req.url().includes("/map/plots")) log.push({ e: "reqfailed", u: req.url().slice(0, 150), err: req.failure() && req.failure().errorText });
  });
  page.on("requestfinished", (req) => {
    if (req.url().includes("/map/plots")) log.push({ e: "reqfinished", u: req.url().slice(0, 150) });
  });
  page.on("response", async (res) => {
    if (res.url().includes("/map/plots")) {
      let body = "";
      try { body = (await res.text()).slice(0, 200); } catch (e) { body = "(body err)"; }
      log.push({ e: "resp", status: res.status(), u: res.url().slice(0, 150), body });
    }
  });
  await page.goto("http://localhost:5174/?embed=1&layout=anne-enclave", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  console.log(JSON.stringify(log, null, 2));
  await browser.close();
})();