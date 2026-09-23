'use strict';
const { chromium } = require('playwright');
const path = require('path');

const PLOTS = ['135', '136', '137', '138', '139'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];
  for (const plotNo of PLOTS) {
    const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
      await page.goto('http://localhost:3000/map-layout/anne-enclave', { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(4000);
      const boardSearchAll = page.locator('input[placeholder="Search plot no…"]');
      await boardSearchAll.nth(1).waitFor({ state: 'visible', timeout: 15000 });
      const boardSearch = boardSearchAll.nth(1); // Phase 2 is the second board section
      await boardSearch.click();
      await boardSearch.fill(plotNo);
      await page.waitForTimeout(1000);
      const popupText = await page.locator('body').innerText().catch(() => '(no board details panel found)');
      await page.screenshot({ path: path.join(__dirname, 'phase4-acceptance-results', 'screenshots', `boundary-${plotNo}.png`) });
      results.push({ plotNo, popupText, consoleErrors });
    } catch (e) {
      results.push({ plotNo, error: String(e), consoleErrors });
    }
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
