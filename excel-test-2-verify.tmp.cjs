'use strict';
const { chromium } = require('playwright');
const path = require('path');
const SCREEN_DIR = path.resolve(__dirname, 'excel-screens');

// One representative plot per layout for map+board browser verification
// (DB already confirmed all 10 targets are correct; this focuses browser
// checks on the trickiest/edge cases plus one straightforward one).
const CHECKS = [
  { layout: 'anne-enclave', plotNo: '1', expectCustomer: 'QA-Anne-P1-1', expectArea: '901', expectRate: '9,010', expectStatus: 'Booked' },
  { layout: 'anne-enclave', plotNo: '135', expectCustomer: 'QA-Anne-P2-1-Edge', expectArea: '1001', expectRate: '10,010', expectStatus: 'Booked' },
  { layout: 'sri-lakshmi', plotNo: '1', expectCustomer: 'QA-SriLakshmi-1-Edge', expectArea: '181', expectRate: '9,100', expectStatus: 'Available' }, // status shown may differ; log actual
  { layout: 'sri-lakshmi', plotNo: '100', expectCustomer: 'QA-SriLakshmi-100', expectArea: '700', expectRate: '7,000', expectStatus: 'Booked' },
  { layout: 'vinfra', plotNo: '1', expectCustomer: 'QA-Vinfra-1-Edge', expectArea: '101', expectRate: '1,010', expectStatus: 'Booked' },
  { layout: 'dokiparru', plotNo: '1', expectCustomer: 'QA-Dokiparru-1-Edge', expectArea: '111', expectRate: '1,110', expectStatus: 'Booked' },
  { layout: 'manjunadha-enclave', plotNo: '10', expectCustomer: 'QA-Manjunadha-10', expectArea: '310', expectRate: '3,100', expectStatus: 'Booked' },
  { layout: 'mandira-developers', plotNo: '50', expectCustomer: 'QA-Mandira-50', expectArea: '501', expectRate: '5,100', expectStatus: 'Booked' },
];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const results = [];

  for (const chk of CHECKS) {
    const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

    const entry = { layout: chk.layout, plotNo: chk.plotNo };
    try {
      await page.goto(`http://localhost:3000/map-layout/${chk.layout}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(5000);

      const mapBox = page.locator(`div[data-native-layout-key="${chk.layout}"]`);
      await mapBox.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);

      // Try the map's own in-canvas search box first.
      const mapSearch = mapBox.locator('input[type="text"], input[placeholder*="Search" i]').first();
      let mapPopupText = null;
      if (await mapSearch.count()) {
        await mapSearch.fill(chk.plotNo);
        await page.waitForTimeout(900);
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(900);
      }
      // Look for a popup/details panel that appeared anywhere on the page after search.
      const popupCandidates = page.locator('text=/Plot\\s*(No\\.?|Details)/i');
      if (await popupCandidates.count()) {
        mapPopupText = await popupCandidates.first().locator('xpath=ancestor::*[self::div][1]').innerText().catch(() => null);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-1-map.png`) });

      // Now use the Plot Board search box to independently verify the board's own data.
      const boardSearch = page.locator('input[placeholder="Search plot no…"]').first();
      let boardText = null;
      if (await boardSearch.count()) {
        await boardSearch.click();
        await boardSearch.fill(chk.plotNo);
        await page.waitForTimeout(700);
        const detailsPanel = page.locator('text=Plot No:').first().locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
        boardText = await detailsPanel.innerText().catch(() => null);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-2-board.png`) });

      // Refresh and re-check the board value persists.
      await page.reload({ waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(4000);
      const boardSearch2 = page.locator('input[placeholder="Search plot no…"]').first();
      let boardTextAfterRefresh = null;
      if (await boardSearch2.count()) {
        await boardSearch2.click();
        await boardSearch2.fill(chk.plotNo);
        await page.waitForTimeout(700);
        const detailsPanel2 = page.locator('text=Plot No:').first().locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
        boardTextAfterRefresh = await detailsPanel2.innerText().catch(() => null);
      }
      await page.screenshot({ path: path.join(SCREEN_DIR, `verify-${chk.layout}-${chk.plotNo}-3-after-refresh.png`) });

      entry.mapPopupText = mapPopupText;
      entry.boardText = boardText;
      entry.boardTextAfterRefresh = boardTextAfterRefresh;
      entry.consoleErrors = consoleErrors;
      entry.ok = true;
    } catch (e) {
      entry.ok = false;
      entry.error = String(e);
      entry.consoleErrors = consoleErrors;
    }
    results.push(entry);
    await context.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
