'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const WB_DIR = path.join(__dirname, '..', 'workbooks', 'phase4');
const SCREEN_DIR = path.join(__dirname, '..', 'phase4-acceptance-results', 'screenshots');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const UPLOADS = [
  { layoutKey: 'sri-lakshmi', layoutTitle: 'Sri Lakshmi Divine City', file: 'sri-lakshmi.xlsx' },
  { layoutKey: 'manjunadha-enclave', layoutTitle: 'Manjunadha Enclave', file: 'manjunadha-enclave.xlsx' },
  { layoutKey: 'vinfra', layoutTitle: 'V Infra ORR Nandana Vanam @ Saripudi', file: 'vinfra.xlsx' },
  { layoutKey: 'dokiparru', layoutTitle: 'Elite Sky City', file: 'dokiparru.xlsx' },
  { layoutKey: 'mandira-developers', layoutTitle: 'Mandira Developers Quantum City', file: 'mandira-developers.xlsx' },
  { layoutKey: 'anne-enclave', layoutTitle: 'Sky line Infra Anne Enclave', file: 'anne-enclave.xlsx' },
];

const STANDALONE_PORTS = ['5174', '5175', '5176', '5177', '5183', '5184'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const standaloneHits = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
  page.on('request', (req) => {
    const url = req.url();
    if (STANDALONE_PORTS.some((p) => url.includes(`:${p}`))) standaloneHits.push(url);
  });

  console.log('=== LOGIN ===');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.locator('input[autocomplete="username"]').first().fill('admin@merit.com');
  await page.locator('input[type="password"]').first().fill('Admin@123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
  console.log('post-login URL:', page.url());

  const results = [];
  for (const { layoutKey, layoutTitle, file } of UPLOADS) {
    console.log(`\n=== UPLOAD: ${file} (${layoutTitle}) ===`);
    try {
      await page.goto('http://localhost:3000/admin/map-plots', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1200);
      const select = page.locator('select').first();
      await select.selectOption({ label: layoutTitle });
      await page.waitForTimeout(600);

      const filePath = path.join(WB_DIR, file);
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SCREEN_DIR, `upload-${layoutKey}-1-preview.png`), fullPage: true });

      const saveBtn = page.locator('button:has-text("Save all")');
      await saveBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREEN_DIR, `upload-${layoutKey}-2-result.png`), fullPage: true });

      const resultText = await page.locator('text=Upload Result').locator('..').first().innerText().catch(() => '(no result panel found)');
      console.log('Result panel:', resultText.replace(/\n/g, ' | '));
      results.push({ layoutKey, file, layoutTitle, resultText, ok: true });
    } catch (e) {
      console.log('ERROR uploading', file, ':', e.message);
      await page.screenshot({ path: path.join(SCREEN_DIR, `upload-${layoutKey}-ERROR.png`), fullPage: true }).catch(() => {});
      results.push({ layoutKey, file, layoutTitle, ok: false, error: e.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
  console.log('\n=== CONSOLE ERRORS ===', consoleErrors.length ? JSON.stringify(consoleErrors) : '(none)');
  console.log('\n=== STANDALONE PORT HITS ===', standaloneHits.length ? JSON.stringify(standaloneHits) : '(none)');

  fs.writeFileSync(
    path.join(__dirname, '..', 'phase4-acceptance-results', 'upload-run-log.json'),
    JSON.stringify({ results, consoleErrors, standaloneHits }, null, 2)
  );

  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
