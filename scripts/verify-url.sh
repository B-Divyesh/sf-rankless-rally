#!/usr/bin/env bash
set -euo pipefail

url="${1:-http://127.0.0.1:4173/demo}"

node --input-type=module - "$url" <<'EOF'
import { chromium } from 'playwright';

const target = process.argv[2];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
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
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(`verified ${target}: title, lang, main, h1, alt text, and console`);
EOF
