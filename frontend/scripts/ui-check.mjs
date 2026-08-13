import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3001';
const outDir = 'C:/xampp/htdocs/obapay-logistics/frontend/scripts/screenshots';
mkdirSync(outDir, { recursive: true });

const errors = [];

async function run(viewport, tag) {
  const email = `ui-check-${tag}-${Date.now()}@obapay.test`;
  const phone = `+234${Math.floor(1000000000 + Math.random() * 899999999)}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${tag}] console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${tag}] pageerror: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon')) {
      errors.push(`[${tag}] HTTP ${res.status()} ${res.url()}`);
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.click('button:has-text("Create account")');
  await page.fill('input[placeholder="First name"]', 'UI');
  await page.fill('input[placeholder="Last name"]', 'Check');
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Phone, e.g. +2348012345678"]', phone);
  await page.fill('input[placeholder="Password (min 10 characters)"]', 'TestPassword123');
  await page.screenshot({ path: `${outDir}/${tag}-01-register-form.png` });
  await page.click('form button[type="submit"]');

  // Local Windows dev machine has heavy first-touch file-scan overhead on
  // PHP's autoload (same AV-scanning pattern seen with other tools this
  // session) — a plain register call took 5.4s directly against the API.
  // Not present on the actual Railway deployment; generous timeout here
  // just accommodates this local machine.
  await page.waitForURL(`${BASE}/`, { timeout: 45000 }).catch((e) => errors.push(`[${tag}] never navigated to / after register: ${e.message}`));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${outDir}/${tag}-02-wallet-dashboard.png`, fullPage: true });

  await page.goto(`${BASE}/logistics/send-parcel`, { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Address line 1"] >> nth=0', '1 Broad St');
  await page.fill('input[placeholder="City"] >> nth=0', 'Lagos');
  await page.fill('input[placeholder="Address line 1"] >> nth=1', 'CBD');
  await page.fill('input[placeholder="City"] >> nth=1', 'Nairobi');
  await page.fill('input[placeholder="Country (ISO2, e.g. KE)"]', 'KE');
  await page.screenshot({ path: `${outDir}/${tag}-03-send-parcel-form.png`, fullPage: true });
  await page.click('button:has-text("Get Shipping Rates")');
  await page.waitForSelector('text=Estimated Cost', { timeout: 45000 }).catch((e) => errors.push(`[${tag}] quote screen never appeared: ${e.message}`));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/${tag}-04-quote.png`, fullPage: true });

  await page.goto(`${BASE}/logistics/shipments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/${tag}-05-shipments-list.png`, fullPage: true });

  await browser.close();
}

await run({ width: 375, height: 812 }, 'mobile');
await run({ width: 1280, height: 800 }, 'laptop');

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(errors, null, 2));
console.log('ERRORS_JSON_END');
