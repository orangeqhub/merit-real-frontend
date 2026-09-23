'use strict';
const { chromium } = require('playwright');
const path = require('path');

const LAYOUTS = ['anne-enclave', 'sri-lakshmi', 'manjunadha-enclave', 'vinfra', 'dokiparru', 'mandira-developers'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];
  for (const layout of LAYOUTS) {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('requestfailed', (req) => failedRequests.push(req.url() + ' :: ' + (req.failure()?.errorText || '')));
    try {
      await page.goto(`http://localhost:3000/map-layout/${layout}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(4000);
      const nativeBox = page.locator(`div[data-native-layout-key="${layout}"]`);
      const mounted = await nativeBox.count();
      const iframeCount = await nativeBox.locator('iframe').count();
      await page.screenshot({ path: path.join(__dirname, '..', '..', 'phase4-acceptance-results', 'screenshots', `standalone-absent-${layout}.png`) });
      results.push({ layout, mounted: mounted > 0, iframeCount, consoleErrors, failedRequests });
    } catch (e) {
      results.push({ layout, error: String(e), consoleErrors, failedRequests });
    }
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
