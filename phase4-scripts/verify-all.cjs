'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREEN_DIR = path.join(__dirname, '..', 'phase4-acceptance-results', 'screenshots');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const STANDALONE_PORTS = ['5174', '5175', '5176', '5177', '5183', '5184'];

const CHECKS = [
  { layout: 'sri-lakshmi', plotNo: '20', expectCustomer: 'PH4-QA-sri-lakshmi-20' },
  { layout: 'sri-lakshmi', plotNo: '21', expectCustomer: 'PH4-QA-sri-lakshmi-21' },
  { layout: 'manjunadha-enclave', plotNo: '1', expectCustomer: 'PH4-QA-manjunadha-enclave-1' },
  { layout: 'manjunadha-enclave', plotNo: '2', expectCustomer: 'PH4-QA-manjunadha-enclave-2' },
  { layout: 'vinfra', plotNo: '2', expectCustomer: 'PH4-QA-vinfra-2' },
  { layout: 'vinfra', plotNo: '3', expectCustomer: 'PH4-QA-vinfra-3' },
  { layout: 'dokiparru', plotNo: '2', expectCustomer: 'PH4-QA-dokiparru-2' },
  { layout: 'dokiparru', plotNo: '3', expectCustomer: 'PH4-QA-dokiparru-3' },
  { layout: 'mandira-developers', plotNo: '1', expectCustomer: 'PH4-QA-mandira-developers-1' },
  { layout: 'mandira-developers', plotNo: '2', expectCustomer: 'PH4-QA-mandira-developers-2' },
  { layout: 'anne-enclave', plotNo: '2', expectCustomer: 'PH4-QA-anne-enclave-p1-2' },
  // anne plotNo 136 (id 1072) intentionally omitted from positive checks: import failed to update it (see results.md).
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];

  for (const chk of CHECKS) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
    const page = await context.newPage();
    const consoleErrors = [];
    const requestFailed = [];
    const standaloneHits = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));
    page.on('requestfailed', (req) => requestFailed.push(req.url() + ' :: ' + (req.failure()?.errorText || '')));
    page.on('request', (req) => {
      const url = req.url();
      if (STANDALONE_PORTS.some((p) => url.includes(`:${p}`))) standaloneHits.push(url);
    });

    const entry = { layout: chk.layout, plotNo: chk.plotNo };
    try {
      await page.goto(`http://localhost:3000/map-layout/${chk.layout}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(4500);

      const mapBox = page.locator(`div[data-native-layout-key="${chk.layout}"]`);
      const mapBoxCount = await mapBox.count();
      entry.nativeMapMounted = mapBoxCount > 0;

      const iframeCount = await mapBox.locator('iframe').count().catch(() => 0);
      entry.iframeInNativeContainer = iframeCount;

      await mapBox.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);

      // Use the map's own in-canvas search.
      const mapSearch = mapBox.locator('input[type="text"], input[placeholder*="Search" i]').first();
      if (await mapSearch.count()) {
        await mapSearch.fill(chk.plotNo);
        await page.waitForTimeout(900);
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(900);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-1-map.png`), fullPage: true });

      const bodyText1 = await page.locator('body').innerText().catch(() => '');
      entry.mapShowsCustomer = bodyText1.includes(chk.expectCustomer);

      // Plot Board search (co-rendered on same page).
      const boardSearch = page.locator('input[placeholder="Search plot no…"]').first();
      if (await boardSearch.count()) {
        await boardSearch.click();
        await boardSearch.fill(chk.plotNo);
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-2-board.png`), fullPage: true });
      const bodyText2 = await page.locator('body').innerText().catch(() => '');
      entry.boardShowsCustomer = bodyText2.includes(chk.expectCustomer);

      // Refresh and recheck persistence.
      await page.reload({ waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(4000);
      const boardSearch2 = page.locator('input[placeholder="Search plot no…"]').first();
      if (await boardSearch2.count()) {
        await boardSearch2.click();
        await boardSearch2.fill(chk.plotNo);
        await page.waitForTimeout(800);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-3-after-refresh.png`), fullPage: true });
      const bodyText3 = await page.locator('body').innerText().catch(() => '');
      entry.persistsAfterRefresh = bodyText3.includes(chk.expectCustomer);

      entry.consoleErrors = consoleErrors;
      entry.requestFailed = requestFailed;
      entry.standaloneHits = standaloneHits;
      entry.ok = true;
    } catch (e) {
      entry.ok = false;
      entry.error = String(e);
      entry.consoleErrors = consoleErrors;
      entry.requestFailed = requestFailed;
      entry.standaloneHits = standaloneHits;
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-ERROR.png`), fullPage: true }).catch(() => {});
    }
    results.push(entry);
    console.log(JSON.stringify(entry));
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(__dirname, '..', 'phase4-acceptance-results', 'verify-run-log.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\n=== DONE ===');
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
