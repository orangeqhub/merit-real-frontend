'use strict';
const { chromium } = require('playwright');
const path = require('path');
const WB_DIR = path.join(__dirname, 'workbooks');
const SCREEN_DIR = path.resolve(__dirname, 'excel-screens');
require('fs').mkdirSync(SCREEN_DIR, { recursive: true });

const UPLOADS = [
  { layoutTitle: 'V Infra ORR Nandana Vanam @ Saripudi', file: 'vinfra.xlsx' },
  { layoutTitle: 'Mandira Developers Quantum City', file: 'mandira.xlsx' },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  console.log('=== LOGIN ===');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[autocomplete="username"]').first();
  await emailInput.fill('admin@merit.com');
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill('Admin@123');
  await page.screenshot({ path: path.join(SCREEN_DIR, '0-login-filled.png') });
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREEN_DIR, '0-after-login.png') });
  console.log('post-login URL:', page.url());

  console.log('=== NAV TO ADMIN MAP PLOTS ===');
  await page.goto('http://localhost:3000/admin/map-plots', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREEN_DIR, '0-admin-mapplots.png') });
  console.log('admin page URL:', page.url());

  const results = [];
  for (const { layoutTitle, file } of UPLOADS) {
    console.log(`\n=== UPLOAD: ${file} (${layoutTitle}) ===`);
    try {
      await page.goto('http://localhost:3000/admin/map-plots', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1000);
      // Select layout in the dropdown by visible label text.
      const select = page.locator('select').first();
      await select.selectOption({ label: layoutTitle });
      await page.waitForTimeout(500);

      const filePath = path.join(WB_DIR, file);
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${file}-1-preview.png`) });

      const saveBtn = page.locator('button:has-text("Save all")');
      await saveBtn.click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SCREEN_DIR, `${file}-2-result.png`) });

      const resultText = await page.locator('text=Upload Result').locator('..').first().innerText().catch(() => '(no result panel found)');
      console.log('Result panel:', resultText.replace(/\n/g, ' | '));
      results.push({ file, layoutTitle, resultText, ok: true });
    } catch (e) {
      console.log('ERROR uploading', file, ':', e.message);
      results.push({ file, layoutTitle, ok: false, error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n=== CONSOLE ERRORS ===');
  console.log(consoleErrors.length ? JSON.stringify(consoleErrors) : '(none)');

  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
