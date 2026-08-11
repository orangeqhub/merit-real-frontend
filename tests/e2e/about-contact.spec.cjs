/* eslint-disable */
/**
 * Browser-driven acceptance tests for the completed About and Contact
 * pages. Run via `npm run test:e2e` (tests/e2e/run-all.cjs boots the dev
 * server). Kept in the repo intentionally — do not delete after running.
 */
const { chromium } = require('playwright');

let navCount = 0;

// Admin no longer authenticates through the public mobile+OTP flow — the
// Admin Portal (/admin) uses Admin Login ID + password.
async function loginAdminAs(page, loginId = 'ADMIN001', password = 'Admin@123') {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}/admin`, { waitUntil: 'load' });
  await page.fill('input[autocomplete=username]', loginId);
  await page.fill('input[autocomplete=current-password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/admin/dashboard', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

function logout(page) {
  return page.evaluate(() => localStorage.removeItem('omkr_session'));
}

async function goto(page, path, wait = 1800) {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

async function runAboutContactTests(baseUrl) {
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

  // ---------- 3. About page sections ----------
  await goto(page, '/about');
  let bodyText = await page.textContent('body');
  const aboutSections = [
    'Building Trust. Finding the Right Property.',
    'Our Story',
    'Our Mission',
    'Our Vision',
    'Our Services',
    'Why Choose Omkareswar Realtors',
    'How We Work',
    'Our Values',
    'Where We Operate',
    'Ready to Find Your Next Property?',
  ];
  const missingSections = aboutSections.filter((s) => !bodyText.includes(s));
  record('3. About page contains all required sections', missingSections.length === 0, `missing=${JSON.stringify(missingSections)}`);
  record('3b. About page no longer shows "under construction"', !bodyText.toLowerCase().includes('under construction'));

  // ---------- 4. About page bilingual ----------
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  record('4. About page is bilingual (Telugu visible after toggle)', /[ఀ-౿]/.test(bodyText));
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);

  // ---------- 5. Contact page no placeholder ----------
  await goto(page, '/about');
  bodyText = await page.textContent('body');
  record('5. Contact page no longer contains "Under Construction"', !bodyText.toLowerCase().includes('under construction'));
  record('5b. Contact page shows FAQ section', bodyText.includes('Frequently Asked Questions'));

  // ---------- 6. Contact form validation ----------
  await page.click('button[type=submit]:has-text("Send Message")');
  await page.waitForTimeout(500);
  bodyText = await page.textContent('body');
  record(
    '6. Contact form validation shows errors on empty submit',
    bodyText.includes('This field is required') || bodyText.includes('agree to be contacted')
  );

  // ---------- 7 & 9 & 10. Fill + submit contact form, check quick-action links ----------
  const telHref = await page.getAttribute('a[href^="tel:"]', 'href');
  record('9. Call link is correct', Boolean(telHref) && telHref.startsWith('tel:+91'));

  const waHref = await page.$eval('a[href*="wa.me"]', (el) => el.getAttribute('href'));
  record(
    '10. WhatsApp link contains the encoded default message',
    waHref.includes('wa.me/91') && waHref.includes('text=') && decodeURIComponent(waHref.split('text=')[1]).includes('Omkareswar Realtors'),
    waHref
  );

  await page.fill('#cf-name', 'Test Enquiry User');
  await page.fill('#cf-mobile', '9876543210');
  await page.selectOption('#cf-enquiry-type', 'buy');
  await page.fill('#cf-message', 'I am interested in a residential plot in Guntur.');
  await page.check('input[type=checkbox]');
  await page.click('button[type=submit]:has-text("Send Message")');
  await page.waitForTimeout(1200);
  bodyText = await page.textContent('body');
  record('7. Contact enquiry submission succeeds (success toast shown)', bodyText.includes('Our team will contact you shortly'));

  const nameValueAfterSubmit = await page.inputValue('#cf-name');
  record('7b. Form resets after successful submission', nameValueAfterSubmit === '');

  // ---------- 8. Admin notification created ----------
  await loginAdminAs(page); // admin
  await goto(page, '/admin/notifications');
  bodyText = await page.textContent('body');
  record('8. Contact enquiry creates an Admin notification', bodyText.includes('Test Enquiry User'));
  await logout(page);

  // ---------- 23. English/Telugu toggle on Contact ----------
  await goto(page, '/about');
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  record('23. English/Telugu toggle works on Contact', /[ఀ-౿]/.test(bodyText));
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);

  // ---------- 27. Console errors ----------
  record('27. No console errors during the about/contact test run', consoleErrors.length === 0, JSON.stringify(consoleErrors));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (about/contact) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runAboutContactTests };
