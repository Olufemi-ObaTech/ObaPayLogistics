import { chromium } from 'playwright';

const BASE = 'https://frontend-production-db02.up.railway.app';
const errors = [];
const email = `prod-check-${Date.now()}@obapay.test`;
const phone = `+234${Math.floor(1000000000 + Math.random() * 899999999)}`;

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
page.on('response', (res) => { if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`); });

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
await page.click('button:has-text("Create account")');
await page.fill('input[placeholder="First name"]', 'Prod');
await page.fill('input[placeholder="Last name"]', 'Check');
await page.fill('input[placeholder="Email"]', email);
await page.fill('input[placeholder="Phone, e.g. +2348012345678"]', phone);
await page.fill('input[placeholder="Password (min 10 characters)"]', 'TestPassword123');
await page.click('form button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 30000 }).catch((e) => errors.push(`never navigated home: ${e.message}`));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'C:/xampp/htdocs/obapay-logistics/frontend/scripts/screenshots/PROD-wallet.png', fullPage: true });

await browser.close();
console.log('PROD_ERRORS_START');
console.log(JSON.stringify(errors, null, 2));
console.log('PROD_ERRORS_END');
