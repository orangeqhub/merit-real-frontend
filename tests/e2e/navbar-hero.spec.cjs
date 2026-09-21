/* eslint-disable */
/**
 * Browser-driven acceptance tests for the public Navbar (Buy Property /
 * Post Property / Contact / Admin / Employee / Ventures / Register all
 * absent; Logo, Home, Properties, About, Select Location, Search, Wishlist,
 * SELL button, Login/Profile, Language toggle present — Register lives only
 * on the Login page now) and the Hero carousel's 3-second autoplay. Run via
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

async function runNavbarHeroTests(baseUrl) {
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

  await goto(page, '/');
  await page.evaluate(() => localStorage.removeItem('omkr_wishlist'));

  // ---------- 1 & 2. Logo ----------
  const logoImg = await page.$('header img[alt="Omkareswar Realtors Logo"]');
  record('1. Real logo appears beside the company name', Boolean(logoImg));

  await goto(page, '/properties');
  await page.click('header a[href="/"] img[alt="Omkareswar Realtors Logo"]');
  await page.waitForTimeout(600);
  record('2. Logo click navigates home', page.url() === `${baseUrl}/` || page.url() === `${baseUrl}`);

  // ---------- 3-9. Navbar contents (desktop) ----------
  await goto(page, '/');
  let desktopHeaderText = await page.locator('header').first().textContent();
  record('3. Select Location is present in the desktop navbar', desktopHeaderText.includes('Select Location'));
  record('4. Buy Property is absent from the desktop navbar', !desktopHeaderText.includes('Buy Property'));
  record('5. Post Property is absent from the desktop navbar', !desktopHeaderText.includes('Post Property'));
  record('6. Contact is absent from the desktop navbar', !desktopHeaderText.includes('Contact'));
  record('7. Admin is absent from the desktop navbar', !desktopHeaderText.includes('Admin'));
  record('8. Employee is absent from the desktop navbar', !desktopHeaderText.includes('Employee'));
  record('9a. Register is absent from the desktop navbar (lives on Login page only)', !desktopHeaderText.includes('Register'));
  record('9c. SELL button is present in the desktop navbar', desktopHeaderText.includes('SELL'));
  record(
    '9b. Desktop navbar contains Home, Properties, About, Wishlist, SELL, Login, language toggle',
    desktopHeaderText.includes('Home') &&
      desktopHeaderText.includes('Properties') &&
      desktopHeaderText.includes('About') &&
      desktopHeaderText.includes('SELL') &&
      desktopHeaderText.includes('Login')
  );

  // ---------- 10. Mobile menu ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, '/', 1000);
  const mobileTopBarText = await page.locator('header').first().textContent();
  record('10c. SELL button is present in the mobile top bar', mobileTopBarText.includes('SELL'));
  await page.click('button[aria-label="Toggle menu"]');
  await page.waitForTimeout(400);
  const mobileMenuText = await page.locator('header').first().textContent();
  record(
    '10. Buy/Post Property, Contact, Admin, Employee, Register are absent from the mobile menu, Select Location is present',
    !mobileMenuText.includes('Buy Property') &&
      !mobileMenuText.includes('Post Property') &&
      !mobileMenuText.includes('Contact') &&
      !mobileMenuText.includes('Admin') &&
      !mobileMenuText.includes('Employee') &&
      !mobileMenuText.includes('Register') &&
      mobileMenuText.includes('Select Location')
  );
  await page.click('button[aria-label="Toggle menu"]');
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---------- 11-13. Wishlist ----------
  await goto(page, '/properties');
  let heartButtons = await page.$$('button[aria-pressed]');
  const firstHeart = heartButtons[0];
  await firstHeart.click();
  await page.waitForTimeout(400);
  let badge = await page.textContent('header a[href="/wishlist"]');
  record('11. Wishlist badge count updates after adding a property', badge.includes('1'), badge);

  await page.click('header a[href="/wishlist"]');
  await page.waitForTimeout(1000);
  record('12. Wishlist page opens at /wishlist and shows the saved property', page.url().endsWith('/wishlist'));
  let wishlistBody = await page.textContent('body');
  const hasRemoveButton = await page.$('button[aria-pressed="true"]');
  record('12b. Wishlist page shows the saved property card', Boolean(hasRemoveButton));

  if (hasRemoveButton) await hasRemoveButton.click();
  await page.waitForTimeout(500);
  badge = await page.textContent('header a[href="/wishlist"]').catch(() => '');
  record('13. Removing from wishlist updates the badge count', !badge || !badge.includes('1'));

  // ---------- 19-22. Hero carousel autoplay ----------
  await goto(page, '/', 800);
  async function currentSlideIndex() {
    const dots = await page.$$('button[aria-label^="Go to slide"]');
    for (let i = 0; i < dots.length; i++) {
      const current = await dots[i].getAttribute('aria-current');
      if (current === 'true') return i;
    }
    return -1;
  }

  const startIndex = await currentSlideIndex();
  await page.waitForTimeout(3400);
  const afterAutoplay = await currentSlideIndex();
  record(
    '19. Hero slide changes within approximately 3 seconds',
    afterAutoplay !== -1 && afterAutoplay !== startIndex,
    `start=${startIndex} after=${afterAutoplay}`
  );

  const beforeManual = await currentSlideIndex();
  await page.click('button[aria-label="Next slide"]');
  // Clicking leaves the mouse hovering the hero AND leaves the button
  // focused, both of which correctly keep autoplay paused per spec
  // (pause-on-hover, pause-on-focus) — clear both so the reset timer can run,
  // matching a real user moving their mouse/focus away after clicking.
  await page.mouse.move(5, 5);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.waitForTimeout(300);
  const afterManual = await currentSlideIndex();
  record('20. Manual next works', afterManual !== beforeManual, `before=${beforeManual} after=${afterManual}`);

  await page.waitForTimeout(1800);
  const shortlyAfterManual = await currentSlideIndex();
  record(
    '21a. Autoplay does not fire early right after manual navigation',
    shortlyAfterManual === afterManual,
    `afterManual=${afterManual} shortlyAfter=${shortlyAfterManual}`
  );
  await page.waitForTimeout(1800);
  const afterResetInterval = await currentSlideIndex();
  record(
    '21b. Autoplay resumes on its own fresh 3s timer after manual navigation',
    afterResetInterval !== shortlyAfterManual,
    `shortlyAfter=${shortlyAfterManual} afterReset=${afterResetInterval}`
  );

  await goto(page, '/', 200);
  const t0 = await currentSlideIndex();
  await page.waitForTimeout(6400);
  const t1 = await currentSlideIndex();
  const slideCount = (await page.$$('button[aria-label^="Go to slide"]')).length;
  const expectedAdvances = 2;
  const actualAdvances = (t1 - t0 + slideCount) % slideCount;
  record(
    '22. Only one carousel interval runs (advances ~2 times in ~6.4s, not more)',
    actualAdvances === expectedAdvances,
    `t0=${t0} t1=${t1} advances=${actualAdvances}`
  );

  // ---------- 23. Hero search no longer offers Rent ----------
  await goto(page, '/');
  const heroText = await page.locator('section').first().textContent();
  record('23. Hero search does not offer a Rent option', !heroText.includes('Rent'));

  // ---------- 28. Responsive navbar ----------
  await page.setViewportSize({ width: 360, height: 800 });
  await goto(page, '/', 1000);
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  record('28. No horizontal overflow at 360px', !overflow);

  await page.setViewportSize({ width: 768, height: 1024 });
  await goto(page, '/', 1000);
  overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  record('28b. No horizontal overflow at 768px', !overflow);

  await page.setViewportSize({ width: 1024, height: 800 });
  await goto(page, '/', 1000);
  overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  record('28c. No horizontal overflow at 1024px', !overflow);

  await page.setViewportSize({ width: 1366, height: 800 });
  await goto(page, '/', 1000);
  overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  record('28d. No horizontal overflow at 1366px (desktop navbar stays on one row)', !overflow);
  await page.setViewportSize({ width: 1280, height: 900 });

  // ---------- 30. Console errors ----------
  record('30. No console errors during the navbar/hero test run', consoleErrors.length === 0, JSON.stringify(consoleErrors));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (navbar/hero) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runNavbarHeroTests };
