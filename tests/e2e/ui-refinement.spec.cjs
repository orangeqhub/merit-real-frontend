/* eslint-disable */
/**
 * Browser-driven acceptance tests for the location-permission popup,
 * favicon, and Admin Dashboard/Reports visual refresh. Run via
 * `npm run test:e2e` (tests/e2e/run-all.cjs boots the dev server). Kept in
 * the repo intentionally — do not delete after running.
 */
const { chromium } = require('playwright');

let navCount = 0;

async function loginAdminAs(page, loginId = 'ADMIN001', password = 'Admin@123') {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}/admin`, { waitUntil: 'load' });
  await page.fill('input[autocomplete=username]', loginId);
  await page.fill('input[autocomplete=current-password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/dashboard', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

function clearGeoPermission(page) {
  return page.evaluate(() => localStorage.removeItem('omkr_geo_permission'));
}

async function goto(page, path, wait = 1800) {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

async function runUiRefinementTests(baseUrl) {
  const results = [];
  function record(name, pass, detail) {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} :: ${name}${detail ? ' :: ' + detail : ''}`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.__base = baseUrl;
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!/net::ERR_/.test(text)) consoleErrors.push(text);
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  // ---------- Favicon ----------
  await goto(page, '/');
  await clearGeoPermission(page);
  const faviconHref = await page.getAttribute('link[rel="icon"]', 'href');
  record('1. Favicon uses the company logo (not the default Vite icon)', faviconHref === '/logo.png', faviconHref);
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
  record('2. Web app manifest is linked', manifestHref === '/manifest.json');
  const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
  record('3. theme-color meta uses the brand colour', themeColor?.toLowerCase() === '#90a955', themeColor);

  // ---------- Location popup: does not appear immediately ----------
  await goto(page, '/', 500);
  let dialog = await page.$('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('4. Location popup does not appear immediately on load', !dialog);

  // ---------- Appears after ~5 seconds ----------
  await page.waitForTimeout(5200);
  dialog = await page.$('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('5. Location popup appears after approximately 5 seconds', Boolean(dialog));
  let dialogText = await page.textContent('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('5b. Popup shows the "Know your location" title', dialogText.includes('Know your location'));

  // ---------- Close (X) does not persist ----------
  await page.click('div[role="dialog"][aria-labelledby="geo-popup-title"] button[aria-label]');
  await page.waitForTimeout(400);
  dialog = await page.$('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('6. Close (X) dismisses the popup', !dialog);
  const savedAfterClose = await page.evaluate(() => localStorage.getItem('omkr_geo_permission'));
  record('6b. Close (X) does not persist a preference', savedAfterClose === null);

  // ---------- Never Allow persists ----------
  await goto(page, '/', 500);
  await page.waitForTimeout(5200);
  await page.click('div[role="dialog"][aria-labelledby="geo-popup-title"] button:has-text("Never allow")');
  await page.waitForTimeout(400);
  const savedNever = await page.evaluate(() => localStorage.getItem('omkr_geo_permission'));
  record('7. Never Allow persists the preference', savedNever === '"never"', savedNever);

  await goto(page, '/', 500);
  await page.waitForTimeout(5200);
  dialog = await page.$('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('8. Popup never reappears after Never Allow', !dialog);
  await clearGeoPermission(page);

  // ---------- Allow while visiting persists ----------
  await goto(page, '/', 500);
  await page.waitForTimeout(5200);
  await page.click('div[role="dialog"][aria-labelledby="geo-popup-title"] button:has-text("Allow while visiting")');
  await page.waitForTimeout(400);
  const savedAlways = await page.evaluate(() => localStorage.getItem('omkr_geo_permission'));
  record('9. Allow while visiting persists the preference', savedAlways === '"allow-always"', savedAlways);

  await goto(page, '/', 500);
  await page.waitForTimeout(5200);
  dialog = await page.$('div[role="dialog"][aria-labelledby="geo-popup-title"]');
  record('10. Popup never reappears after Allow while visiting', !dialog);
  await clearGeoPermission(page);

  // ---------- Admin Dashboard colour refresh ----------
  await loginAdminAs(page);
  await goto(page, '/admin/dashboard');
  const cardBg = await page.$$eval('div[class*="rounded-lg"][class*="bg-"]', (els) =>
    Array.from(new Set(els.map((el) => el.className.match(/bg-\S+/)?.[0]).filter(Boolean)))
  );
  record('11. Admin Dashboard stat cards use multiple distinct accent colours', cardBg.length >= 5, JSON.stringify(cardBg));

  // ---------- Admin Reports colour refresh ----------
  await goto(page, '/admin/reports');
  const reportsCardBg = await page.$$eval('div[class*="rounded-lg"][class*="bg-"]', (els) =>
    Array.from(new Set(els.map((el) => el.className.match(/bg-\S+/)?.[0]).filter(Boolean)))
  );
  record('12. Admin Reports widgets use multiple distinct accent colours', reportsCardBg.length >= 3, JSON.stringify(reportsCardBg));

  // ---------- Console errors ----------
  record('13. No console errors during the ui-refinement test run', consoleErrors.length === 0, JSON.stringify(consoleErrors));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (ui refinement) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runUiRefinementTests };
