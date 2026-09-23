'use strict';
const { chromium } = require('playwright');
const path = require('path');
const SCREEN_DIR = path.resolve(__dirname, 'excel-screens');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto('http://localhost:3000/map-layout/anne-enclave', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(5000);

  const mapBox = page.locator('div[data-native-layout-key="anne-enclave"]');
  await mapBox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const allInputsInMap = await mapBox.locator('input').all();
  console.log('inputs found inside map box:', allInputsInMap.length);
  for (let i = 0; i < allInputsInMap.length; i++) {
    const ph = await allInputsInMap[i].getAttribute('placeholder').catch(() => null);
    console.log(`  input[${i}] placeholder=`, ph);
  }
  const mapSearch = mapBox.locator('input[placeholder*="Search" i]').first();
  await mapSearch.fill('135');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREEN_DIR, 'recheck-anne-135-popup.png') });

  const popupText = await page.locator('text=Plot No').first().locator('xpath=ancestor::*[3]').innerText().catch(() => '(not found)');
  console.log('POPUP TEXT:', JSON.stringify(popupText));

  console.log('CONSOLE ERRORS:', consoleErrors.length ? JSON.stringify(consoleErrors) : '(none)');
  await browser.close();
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(1); });
