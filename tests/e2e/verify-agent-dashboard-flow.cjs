'use strict';
const { chromium } = require('playwright');
const path = require('path');

const SHOT_DIR = path.join(__dirname, '..', '..', 'phase4-acceptance-results', 'screenshots');
const stamp = Date.now();
const testEmail = `agent-test-${stamp}@merit.test`;
const testPassword = 'AgentTest@123';
const testMobile = '9' + String(stamp).slice(-9);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = {};

  // ---- 1. Admin login, create Agent (grade ABC) ----
  const adminCtx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const admin = await adminCtx.newPage();
  const adminErrors = [];
  admin.on('console', (m) => { if (m.type() === 'error') adminErrors.push(m.text()); });

  await admin.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(1000);
  await admin.locator('input[autocomplete="username"]').first().fill('admin@merit.com');
  await admin.locator('input[type="password"]').first().fill('Admin@123');
  await admin.locator('button[type="submit"]').first().click();
  await admin.waitForTimeout(2000);
  results.adminLoginUrl = admin.url();

  await admin.goto('http://localhost:3000/admin/agents', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(1500);
  await admin.locator('button:has-text("New Agent Registration")').first().click();
  await admin.waitForTimeout(500);

  await admin.locator('input[required]').nth(0).fill('QA Agent Test');
  // mobile (inputMode numeric, required)
  const mobileInput = admin.locator('input[inputMode="numeric"][required]').first();
  await mobileInput.fill(testMobile);
  await admin.locator('input[type="email"][required]').first().fill(testEmail);
  await admin.locator('input[type="password"][required]').first().fill(testPassword);
  await admin.locator('input[placeholder="e.g. Software Engineer"]').first().fill('QA Automation');

  // Assigned Grade select -> ABC
  const gradeSelect = admin.locator('select').filter({ has: admin.locator('option[value="ABC"]') }).first();
  await gradeSelect.selectOption('ABC').catch(async () => {
    // fallback: find any select with an ABC option anywhere in the modal
    const selects = admin.locator('form select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some((o) => /ABC/i.test(o))) {
        await selects.nth(i).selectOption('ABC');
        break;
      }
    }
  });

  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-1-create-form.png') });
  await admin.locator('button[type="submit"]').first().click();
  await admin.waitForTimeout(2000);
  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-2-after-save.png') });
  results.createErrors = adminErrors;

  // Confirm the new row exists in the list with grade ABC
  await admin.waitForTimeout(500);
  const rowText = await admin.locator(`text=${testEmail}`).first().locator('xpath=ancestor::tr[1]').innerText().catch(() => '(row not found)');
  results.createdRowText = rowText;

  // ---- 2. Admin logout ----
  const logoutIconBtn = admin.locator('button:has(svg)').filter({ hasText: '' });
  // The header has a small icon-only logout button (LogOut icon) next to the admin name.
  const headerLogout = admin.locator('header button, [class*="header"] button').last();
  results.logoutButtonFound = false;
  const namedLogout = admin.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();
  if (await namedLogout.count()) {
    results.logoutButtonFound = 'named';
    await namedLogout.click();
    await admin.waitForTimeout(1500);
  } else {
    results.logoutButtonFound = 'fallback-clear';
    await admin.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await admin.goto('http://localhost:3000/login', { waitUntil: 'load' });
  }
  await admin.waitForTimeout(500);
  results.afterAdminLogoutUrl = admin.url();
  results.afterLogoutHasToken = await admin.evaluate(() => !!localStorage.getItem('token') || !!localStorage.getItem('accessToken') || Object.keys(localStorage).some(k => k.toLowerCase().includes('auth')));

  // Try /admin as unauthenticated (should redirect to login)
  await admin.goto('http://localhost:3000/admin/agents', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(2000);
  results.unauthAdminAgentsUrl = admin.url();
  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-unauth-admin.png') });

  // ---- 3. Agent login ----
  await admin.goto('http://localhost:3000/login', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(800);
  await admin.locator('#emailOrMobile').fill(testEmail);
  await admin.locator('#password').fill(testPassword);
  await admin.locator('button[type="submit"]').first().click();
  await admin.waitForTimeout(2500);
  results.agentLoginUrl = admin.url();
  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-3-post-login.png') });

  // ---- 4. /agent dashboard content ----
  await admin.goto('http://localhost:3000/agent/dashboard', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(2000);
  results.agentDashboardUrl = admin.url();
  const dashboardText = await admin.locator('body').innerText();
  results.agentDashboardHasEmail = dashboardText.includes(testEmail);
  results.agentDashboardHas20 = /20\s*%/.test(dashboardText);
  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-4-dashboard.png') });

  // ---- 5. Security: agent tries /admin ----
  await admin.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'load', timeout: 30000 });
  await admin.waitForTimeout(1500);
  results.agentTriedAdminUrl = admin.url();
  await admin.screenshot({ path: path.join(SHOT_DIR, 'agent-flow-5-blocked-admin.png') });

  await adminCtx.close();

  // ---- 6. Unauthenticated /agent ----
  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  await anon.goto('http://localhost:3000/agent/dashboard', { waitUntil: 'load', timeout: 30000 });
  await anon.waitForTimeout(1000);
  results.unauthAgentDashboardUrl = anon.url();
  await anonCtx.close();

  await browser.close();
  results.testEmail = testEmail;
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
