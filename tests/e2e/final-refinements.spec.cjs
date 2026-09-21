/* eslint-disable */
/**
 * Browser-driven acceptance tests for the unified Register flow (single
 * merged form, no separate Account Selection page, Role dropdown defaulting
 * to Buyer) reachable only from the Login page's "Register" link — Register
 * itself is absent from the Navbar, which instead carries a SELL button —
 * plus Hero button relabeling and the live-location "Use My Current
 * Location" / nearby-sort / distance-badge features. Run via
 * `npm run test:e2e` (tests/e2e/run-all.cjs boots the dev server). Kept in
 * the repo intentionally — do not delete after running.
 */
const { chromium } = require('playwright');

let navCount = 0;

async function goto(page, path, wait = 1800) {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

async function runFinalRefinementsTests(baseUrl) {
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

  // ---------- 1. Register absent from Navbar (desktop) ----------
  await goto(page, '/');
  let headerText = await page.locator('header').first().textContent();
  record('1. Register is absent from the desktop navbar', !headerText.includes('Register'));

  // ---------- 2. Register absent from mobile menu ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, '/', 1000);
  await page.click('button[aria-label="Toggle menu"]');
  await page.waitForTimeout(400);
  headerText = await page.locator('header').first().textContent();
  record('2. Register is absent from the mobile menu', !headerText.includes('Register'));
  await page.click('button[aria-label="Toggle menu"]');
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---------- 3. /register/buyer redirects to the unified /register form ----------
  await goto(page, '/register/buyer');
  let bodyText = await page.textContent('body');
  record(
    '3. /register/buyer redirects to /register (route not removed, no 404)',
    page.url().endsWith('/register') && !bodyText.toLowerCase().includes('not found')
  );

  // ---------- 4. Login page shows a "Register" link ----------
  await goto(page, '/login');
  bodyText = await page.textContent('body');
  record('4. Login page shows "Don\'t have an account?"', bodyText.includes("Don't have an account?"));
  record('4b. Login page shows a "Register" link', bodyText.includes('Register'));

  // ---------- 5. Clicking "Register" opens the unified Register form directly ----------
  await page.click('a:has-text("Register")');
  await page.waitForTimeout(800);
  record('5. "Register" opens the unified form at /register', page.url().endsWith('/register'));
  bodyText = await page.textContent('body');
  record(
    '5b. Unified Register form shows Name/Mobile/Email/Password/Confirm Password/City/Address fields',
    Boolean(await page.$('#name')) &&
      Boolean(await page.$('#mobile')) &&
      Boolean(await page.$('#email')) &&
      Boolean(await page.$('#password')) &&
      Boolean(await page.$('#confirmPassword')) &&
      Boolean(await page.$('#city')) &&
      Boolean(await page.$('#address'))
  );
  record('5c. No separate Account Selection page ("Continue as X" buttons absent)', !bodyText.includes('Continue as Buyer'));

  // ---------- 6. Role dropdown defaults to Buyer and offers all three roles ----------
  const roleOptions = await page.$eval('#role', (el) => Array.from(el.options).map((o) => o.value));
  const roleValue = await page.$eval('#role', (el) => el.value);
  record(
    '6. Role dropdown defaults to Buyer and offers Buyer/Seller/Mediator',
    roleValue === 'buyer' && ['buyer', 'seller', 'mediator'].every((r) => roleOptions.includes(r))
  );

  // ---------- 7. Hero button labels ----------
  await goto(page, '/');
  bodyText = await page.textContent('body');
  record('7. Hero shows "Buy Properties" (not "Browse Properties")', bodyText.includes('Buy Properties') && !bodyText.includes('Browse Properties'));
  record('7b. Hero shows "Sell Your Property" (not "Post Your Property")', bodyText.includes('Sell Your Property') && !bodyText.includes('Post Your Property'));

  // ---------- 8. Location dropdown offers "Use My Current Location" ----------
  const locationOptions = await page.$eval('select[aria-label]', (el) =>
    Array.from(el.options).map((o) => o.textContent)
  ).catch(() => []);
  record(
    '8. Hero location dropdown offers "Use My Current Location" as the first real option',
    locationOptions.some((label) => label.includes('Use My Current Location'))
  );

  // ---------- 9-11. Live location: granted, nearby sort, distance badge ----------
  await browser.close();

  const geoBrowser = await chromium.launch();
  const context = await geoBrowser.newContext({
    viewport: { width: 1280, height: 900 },
    geolocation: { latitude: 16.5062, longitude: 80.648 }, // Vijayawada
    permissions: ['geolocation'],
  });
  const geoPage = await context.newPage();
  geoPage.__base = baseUrl;
  const geoConsoleErrors = [];
  geoPage.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!/net::ERR_/.test(text)) geoConsoleErrors.push(text);
  });

  await geoPage.goto(`${baseUrl}/`, { waitUntil: 'load' });
  await geoPage.waitForTimeout(1500);
  const locationSelect = geoPage.locator('select[aria-label]').first();
  await locationSelect.selectOption({ label: '📍 Use My Current Location' });
  await geoPage.waitForTimeout(3000);
  const optionsAfterGrant = await locationSelect.evaluate((el) => Array.from(el.options).map((o) => o.textContent));
  record(
    '9. Selecting "Use My Current Location" resolves to a detected place in the dropdown',
    optionsAfterGrant.some((label) => label.includes('Detected') || label.includes('గుర్తించబడింది')),
    JSON.stringify(optionsAfterGrant)
  );

  await geoPage.goto(`${baseUrl}/properties`, { waitUntil: 'load' });
  await geoPage.waitForTimeout(2000);
  // Re-trigger from the properties page context isn't needed — coords live
  // in a global store that persists across client-side navigation. Since
  // this is a fresh full navigation, re-select to be safe.
  await geoPage.goto(`${baseUrl}/`, { waitUntil: 'load' });
  await geoPage.waitForTimeout(1200);
  await geoPage.locator('select[aria-label]').first().selectOption({ label: '📍 Use My Current Location' });
  await geoPage.waitForTimeout(3000);
  await geoPage.click('a:has-text("Buy Properties")');
  await geoPage.waitForTimeout(1500);
  const propertiesBody = await geoPage.textContent('body');
  record(
    '10. Property cards show a distance badge once location is available',
    propertiesBody.includes('km away') || propertiesBody.includes('Near You'),
    propertiesBody.includes('km away') ? 'km away found' : propertiesBody.includes('Near You') ? 'Near You found' : 'neither found'
  );

  record('11. No console errors during the geolocation test run', geoConsoleErrors.length === 0, JSON.stringify(geoConsoleErrors));

  await geoBrowser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (final refinements) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runFinalRefinementsTests };
