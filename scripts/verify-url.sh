#!/usr/bin/env bash
set -euo pipefail

url="${1:-http://127.0.0.1:4173/demo}"

node --input-type=module - "$url" <<'EOF'
import { chromium } from 'playwright';

const target = process.argv[2];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
let documentStatus = 0;
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) documentStatus = response.status();
});
await page.goto(target, { waitUntil: 'networkidle' });
const checks = {
  lang: await page.locator('html').getAttribute('lang'),
  title: await page.title(),
  mainCount: await page.locator('main').count(),
  h1Count: await page.locator('h1').count(),
  imagesWithoutAlt: await page.locator('img:not([alt])').count()
};
await browser.close();
if (checks.lang !== 'en') throw new Error(`Expected lang=en, got ${checks.lang}`);
if (!checks.title) throw new Error('Expected a document title');
if (checks.mainCount !== 1) throw new Error(`Expected one main landmark, got ${checks.mainCount}`);
if (checks.h1Count !== 1) throw new Error(`Expected one h1, got ${checks.h1Count}`);
if (checks.imagesWithoutAlt !== 0) throw new Error(`Found ${checks.imagesWithoutAlt} image(s) without alt text`);
const unexpectedConsoleErrors = documentStatus === 404
  ? consoleErrors.filter((message) => !message.includes('server responded with a status of 404'))
  : consoleErrors;
if (unexpectedConsoleErrors.length) throw new Error(`Console errors: ${unexpectedConsoleErrors.join(' | ')}`);
if (![200, 404].includes(documentStatus)) throw new Error(`Expected HTTP 200 or 404, got ${documentStatus}`);
console.log(`verified ${target}: HTTP ${documentStatus}, title, lang, main, h1, alt text, and console`);
EOF
