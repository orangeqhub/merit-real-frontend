/* eslint-disable */
/**
 * Browser-driven acceptance tests for the Admin/Employee Portal login
 * separation from the public Buyer/Seller/Mediator OTP login. Run via
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

function logout(page) {
  return page.evaluate(() => localStorage.removeItem('omkr_session'));
}

async function loginPublicAs(page, mobile) {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}/login`, { waitUntil: 'load' });
  await page.fill('#login-mobile', mobile);
  await page.click('button[type=submit]');
  await page.waitForSelector('#login-otp', { timeout: 5000 });
  await page.fill('#login-otp', '1234');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1200);
}

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

async function loginEmployeeAs(page, employeeId, password = 'Employee@123') {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}/employee`, { waitUntil: 'load' });
  await page.fill('input[autocomplete=username]', employeeId);
  await page.fill('input[autocomplete=current-password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/employee/dashboard', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1800);
}

async function runAuthPortalsTests(baseUrl) {
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

  // ---------- 7. Public /login does not show Admin or Employee roles ----------
  // Scoped to <main> (the page content, not the surrounding Navbar) since the
  // Navbar itself legitimately shows Admin/Employee portal links on every
  // public page — this check is about the login FORM's own role options.
  await goto(page, '/login');
  let bodyText = await page.locator('main').first().textContent();
  record(
    '7. Public /login does not show Admin or Employee roles',
    !bodyText.includes('Admin') && !bodyText.includes('Employee')
  );

  // ---------- 8. Admin page asks for Login ID and Password ----------
  await goto(page, '/admin');
  bodyText = await page.textContent('body');
  record('8. Admin page asks for Login ID and Password', bodyText.includes('Admin Login ID') && bodyText.includes('Password'));

  // ---------- 10. Invalid Admin credentials show an error ----------
  await page.fill('input[autocomplete=username]', 'WRONGID');
  await page.fill('input[autocomplete=current-password]', 'wrongpass');
  await page.click('button[type=submit]');
  await page.waitForTimeout(700);
  bodyText = await page.textContent('body');
  record('10. Invalid Admin credentials show an error', bodyText.includes('Invalid Login ID or Password'));

  // ---------- 9. Valid Admin credentials open /admin/dashboard ----------
  await loginAdminAs(page);
  record('9. Valid Admin credentials open /admin/dashboard', page.url().endsWith('/admin/dashboard'));

  // ---------- 23. Admin logout returns to /admin ----------
  // Use the dashboard header's logout button explicitly.
  const logoutButtons = await page.$$('button[aria-label]');
  for (const btn of logoutButtons) {
    const label = await btn.getAttribute('aria-label');
    if (label === 'Logout') {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(900);
  record('23. Admin logout returns to /admin', page.url().endsWith('/admin'));
  await logout(page);

  // ---------- 19. Employee cannot access /admin/dashboard ----------
  await loginEmployeeAs(page, 'EMP-2026-0001');
  await goto(page, '/admin/dashboard');
  bodyText = await page.textContent('body');
  record('19. Employee cannot access /admin/dashboard', bodyText.includes('Admin Portal'));

  // ---------- 20. Admin cannot use Employee work routes as an Employee ----------
  await logout(page);
  await loginAdminAs(page);
  await goto(page, '/employee/dashboard');
  bodyText = await page.textContent('body');
  record('20. Admin session is not treated as an Employee on Employee routes', bodyText.includes('Employee Portal'));

  // ---------- 24. Employee logout returns to /employee ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0001');
  const empLogoutButtons = await page.$$('button[aria-label]');
  for (const btn of empLogoutButtons) {
    const label = await btn.getAttribute('aria-label');
    if (label === 'Logout') {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(900);
  record('24. Employee logout returns to /employee', page.url().endsWith('/employee'));
  await logout(page);

  // ---------- 11. Employee page asks for Employee ID and Password ----------
  await goto(page, '/employee');
  bodyText = await page.textContent('body');
  record('11. Employee page asks for Employee ID and Password', bodyText.includes('Employee ID') && bodyText.includes('Password'));

  // ---------- 13. Invalid Employee credentials show an error ----------
  await page.fill('input[autocomplete=username]', 'EMP-9999-9999');
  await page.fill('input[autocomplete=current-password]', 'wrongpass');
  await page.click('button[type=submit]');
  await page.waitForTimeout(700);
  bodyText = await page.textContent('body');
  record('13. Invalid Employee credentials show an error', bodyText.includes('Invalid Employee ID or Password'));

  // ---------- 12. Valid Employee credentials open /employee/dashboard ----------
  await page.fill('input[autocomplete=username]', 'EMP-2026-0001');
  await page.fill('input[autocomplete=current-password]', 'Employee@123');
  await page.click('button[type=submit]');
  await page.waitForTimeout(1000);
  record('12. Valid Employee credentials open /employee/dashboard', page.url().endsWith('/employee/dashboard'));
  await logout(page);

  // ---------- 14. Pending Employee is blocked ----------
  await goto(page, '/employee');
  await page.fill('input[autocomplete=username]', 'EMP-2026-0005');
  await page.fill('input[autocomplete=current-password]', 'Employee@123');
  await page.click('button[type=submit]');
  await page.waitForTimeout(700);
  bodyText = await page.textContent('body');
  record('14. Pending Employee is blocked with a status-specific error', bodyText.includes('pending approval'));

  // ---------- 15. Rejected Employee is blocked ----------
  await page.fill('input[autocomplete=username]', 'EMP-2026-0006');
  await page.fill('input[autocomplete=current-password]', 'Employee@123');
  await page.click('button[type=submit]');
  await page.waitForTimeout(700);
  bodyText = await page.textContent('body');
  record('15. Rejected Employee is blocked with a status-specific error', bodyText.includes('rejected'));

  // ---------- 16. Inactive Employee is blocked ----------
  await page.fill('input[autocomplete=username]', 'EMP-2026-0004');
  await page.fill('input[autocomplete=current-password]', 'Employee@123');
  await page.click('button[type=submit]');
  await page.waitForTimeout(700);
  bodyText = await page.textContent('body');
  record('16. Inactive Employee is blocked with a status-specific error', bodyText.includes('inactive'));

  // ---------- 21. Admin mobile number cannot authenticate through public OTP ----------
  await loginPublicAs(page, '9000000001'); // admin's mobile
  bodyText = await page.textContent('body');
  record(
    '21. Admin mobile number cannot authenticate through public OTP',
    bodyText.includes('Buyers, Sellers and Mediators') && page.url().includes('/login')
  );

  // ---------- 22. Employee mobile number cannot authenticate through public OTP ----------
  await loginPublicAs(page, '9000000002'); // employee-1's mobile
  bodyText = await page.textContent('body');
  record(
    '22. Employee mobile number cannot authenticate through public OTP',
    bodyText.includes('Buyers, Sellers and Mediators') && page.url().includes('/login')
  );

  // ---------- 17. Buyer cannot access /admin/dashboard ----------
  await loginPublicAs(page, '9000000004'); // approved buyer
  await goto(page, '/admin/dashboard');
  bodyText = await page.textContent('body');
  record('17. Buyer cannot access /admin/dashboard', bodyText.includes('Admin Portal'));

  // ---------- 25. Buyer logout returns to /login ----------
  await goto(page, '/buyer/dashboard');
  const logoutBtns = await page.$$('button[aria-label]');
  for (const btn of logoutBtns) {
    const label = await btn.getAttribute('aria-label');
    if (label === 'Logout') {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(900);
  record('25. Buyer logout returns to /login', page.url().endsWith('/login'));
  await logout(page);

  // ---------- 18. Seller cannot access /employee/dashboard ----------
  await loginPublicAs(page, '9000000003'); // approved seller
  await goto(page, '/employee/dashboard');
  bodyText = await page.textContent('body');
  record('18. Seller cannot access /employee/dashboard', bodyText.includes('Employee Portal'));
  await logout(page);

  // ---------- 26. English/Telugu switching works on Admin Login ----------
  await goto(page, '/admin');
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  record('26. English/Telugu switching works on Admin Login', /[ఀ-౿]/.test(bodyText));
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);

  // ---------- 27. English/Telugu switching works on Employee Login ----------
  await goto(page, '/employee');
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  record('27. English/Telugu switching works on Employee Login', /[ఀ-౿]/.test(bodyText));
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);

  // ---------- 30. No console errors ----------
  record('30. No console errors during the auth-portals test run', consoleErrors.length === 0, JSON.stringify(consoleErrors));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (auth portals) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runAuthPortalsTests };
