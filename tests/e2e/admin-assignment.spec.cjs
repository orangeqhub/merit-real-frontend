/* eslint-disable */
/**
 * Browser-driven acceptance tests for the Admin Visit/Follow-up assignment
 * workflow. Run via `npm run test:e2e` (tests/e2e/run-all.cjs boots the dev
 * server and runs this alongside employee-dashboard.spec.cjs). Kept in the
 * repo intentionally — do not delete after running.
 */
const { chromium } = require('playwright');

let navCount = 0;

// Admin and Employee no longer authenticate through the public mobile+OTP
// flow — they use their own dedicated portals (/admin, /employee).
async function loginAdminAs(page, loginId = 'ADMIN001', password = 'Admin@123') {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}/admin`, { waitUntil: 'load' });
  await page.fill('input[autocomplete=username]', loginId);
  await page.fill('input[autocomplete=current-password]', password);
  await page.click('button[type=submit]');
  // Let the client-side redirect to /admin/dashboard fully settle before any
  // subsequent page.goto() runs, so the two navigations never race.
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

function logout(page) {
  return page.evaluate(() => localStorage.removeItem('omkr_session'));
}

async function goto(page, path, wait = 1800) {
  navCount += 1;
  if (navCount % 4 === 0) await page.waitForTimeout(2000);
  await page.goto(`${page.__base}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
}

// Assigns/reassigns a row identified by rowText to the named employee via
// the row's Assign/Reassign button + AssignmentModal dropdown.
async function assignRow(page, rowText, employeeName) {
  const row = page.locator('tr', { hasText: rowText }).first();
  await row.locator('button', { hasText: /Assign|Reassign|కేటాయించండి/ }).click();
  await page.waitForTimeout(300);
  await page.selectOption('#assignment-employee', { label: employeeName });
  await page.click('form button[type=submit]');
  await page.waitForTimeout(900);
}

async function runAdminAssignmentTests(baseUrl) {
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

  // ---------- 1. Admin assigns visit v-2 (Naveen Kumar) to Employee 1 ----------
  await loginAdminAs(page); // admin
  await goto(page, '/admin/visits');
  await assignRow(page, 'Naveen Kumar', 'Lakshmi Priya (Employee)');
  let bodyText = await page.textContent('body');
  record('1. Admin assigns a visit to Employee 1', bodyText.includes('Lakshmi Priya (Employee)'));

  // ---------- 2. Employee 1 can see the visit ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0001'); // employee-1
  await goto(page, '/employee/visits');
  bodyText = await page.textContent('body');
  record('2. Employee 1 can see the assigned visit', bodyText.includes('Naveen Kumar'));

  // ---------- 3. Employee 2 cannot see the visit ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0003'); // employee-3 ("Employee 2")
  await goto(page, '/employee/visits');
  bodyText = await page.textContent('body');
  record('3. Employee 2 cannot see the visit before reassignment', !bodyText.includes('Naveen Kumar'));

  // ---------- 4. Admin reassigns the visit to Employee 2 ----------
  await logout(page);
  await loginAdminAs(page); // admin
  await goto(page, '/admin/visits');
  await assignRow(page, 'Naveen Kumar', 'Suman Reddy (Employee 2)');
  bodyText = await page.textContent('body');
  record('4. Admin reassigns the visit to Employee 2', bodyText.includes('Suman Reddy (Employee 2)'));

  // ---------- 5. Employee 1 can no longer see it ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0001');
  await goto(page, '/employee/visits');
  bodyText = await page.textContent('body');
  record('5. Employee 1 can no longer see the reassigned visit', !bodyText.includes('Naveen Kumar'));

  // ---------- 6. Employee 2 can see it ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0003');
  await goto(page, '/employee/visits');
  bodyText = await page.textContent('body');
  record('6. Employee 2 can see the visit after reassignment', bodyText.includes('Naveen Kumar'));

  // ---------- 7. Admin assigns a follow-up to Employee 1 ----------
  await logout(page);
  await loginAdminAs(page);
  await goto(page, '/admin/follow-ups');
  await assignRow(page, 'Complete identity verification review', 'Lakshmi Priya (Employee)');
  bodyText = await page.textContent('body');
  record('7. Admin assigns a follow-up to Employee 1', bodyText.includes('Lakshmi Priya (Employee)'));

  // ---------- 8. Employee Dashboard counts update ----------
  await logout(page);
  await loginEmployeeAs(page, 'EMP-2026-0001');
  await goto(page, '/employee/dashboard');
  bodyText = await page.textContent('body');
  const overdueMatch = bodyText.match(/Overdue(\d+)/);
  record(
    '8. Employee Dashboard overdue count reflects newly-assigned overdue follow-up',
    Boolean(overdueMatch) && Number(overdueMatch[1]) >= 1,
    overdueMatch ? overdueMatch[0] : 'not found'
  );

  // ---------- 9. Assignment creates a notification ----------
  await goto(page, '/employee/notifications', 2200);
  bodyText = await page.textContent('body');
  record('9. Assignment creates a notification for the assigned employee', bodyText.includes('site visit') || bodyText.includes('follow-up task'));

  // ---------- 10. Assignment creates an audit-log entry ----------
  await logout(page);
  await loginAdminAs(page);
  await goto(page, '/admin/audit-logs');
  bodyText = await page.textContent('body');
  record('10. Assignment creates an audit-log entry', bodyText.includes('visit.assign') || bodyText.includes('followup.assign') || /assigned/.test(bodyText));

  // ---------- 11. Inactive employee cannot be assigned ----------
  await goto(page, '/admin/visits');
  const row = page.locator('tr', { hasText: 'Naveen Kumar' }).first();
  await row.locator('button', { hasText: /Assign|Reassign/ }).click();
  await page.waitForTimeout(300);
  const optionsText = await page.$eval('#assignment-employee', (el) => Array.from(el.options).map((o) => o.textContent).join('|'));
  record('11. Inactive employee does not appear in the assign dropdown', !optionsText.includes('Rajesh Varma'));
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(300);

  // ---------- 12. English/Telugu assignment UI works ----------
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  const hasTelugu = /[ఀ-౿]/.test(bodyText);
  record('12. English/Telugu assignment UI works', hasTelugu);
  await page.click('button[aria-label="Toggle language between English and Telugu"]');
  await page.waitForTimeout(400);

  record('13. No console errors during the assignment test run', consoleErrors.length === 0, JSON.stringify(consoleErrors));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== ${results.length - failed.length}/${results.length} PASSED (admin assignment) ===`);
  if (failed.length) {
    console.log('FAILED TESTS:', failed.map((f) => f.name));
  }
  return failed.length === 0 ? 0 : 1;
}

module.exports = { runAdminAssignmentTests };
