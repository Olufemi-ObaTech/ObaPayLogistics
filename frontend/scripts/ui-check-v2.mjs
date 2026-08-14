import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.CHECK_BASE_URL ?? 'http://localhost:3001';
const outDir = 'C:/xampp/htdocs/obapay-logistics/frontend/scripts/screenshots';
mkdirSync(outDir, { recursive: true });

async function run(viewport, tag) {
  const errors = [];
  const email = `v2-check-${tag}-${Date.now()}@obapay.test`;
  const phone = `+234${Math.floor(1000000000 + Math.random() * 899999999)}`;

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport })).newPage();
  page.on('console', (msg) => { console.log(`[${tag}][console.${msg.type()}]`, msg.text()); if (msg.type() === 'error') errors.push(`[${tag}] console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`[${tag}] pageerror: ${err.message}`));
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('favicon')) errors.push(`[${tag}] HTTP ${res.status()} ${res.url()}`); });

  console.error(`[${tag}] step: goto login`);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.error(`[${tag}] step: wait for create account tab`);
  await page.waitForSelector('button:has-text("Create account")', { timeout: 30000 });
  await page.click('button:has-text("Create account")');
  console.error(`[${tag}] step: fill register form`);
  await page.getByLabel('First name').fill('V2');
  await page.getByLabel('Last name').fill('Check');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Phone').fill(phone);
  await page.getByLabel('Password').fill('TestPassword123');
  console.error(`[${tag}] step: submit register`);
  await page.click('form button[type="submit"]');
  console.error(`[${tag}] step: wait for redirect to hub`);
  await page.waitForURL(`${BASE}/`, { timeout: 60000 });
  console.error(`[${tag}] step: wait for Welcome back text`);
  await page.waitForSelector('text=Welcome back', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-01-hub.png`, fullPage: true });
  console.error(`[${tag}] step: hub screenshot done`);

  // NeoBank section
  await page.click('a[href="/bank"]');
  console.error(`[${tag}] step: clicked into /bank`);
  await page.waitForSelector('h1:has-text("Your Wallets")', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-02-bank-dashboard.png`, fullPage: true });
  console.error(`[${tag}] step: bank dashboard done`);

  await page.goto(`${BASE}/bank/send`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1:has-text("Send Money")', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-03-send-money.png`, fullPage: true });
  console.error(`[${tag}] step: send money done`);

  await page.goto(`${BASE}/bank/transactions`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1:has-text("Activity")', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-04-transactions.png`, fullPage: true });
  console.error(`[${tag}] step: transactions done`);

  await page.goto(`${BASE}/bank/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1:has-text("Security")', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-05-settings.png`, fullPage: true });
  console.error(`[${tag}] step: settings done`);

  // Logistics section
  await page.goto(`${BASE}/logistics`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('h1:has-text("Logistics")', { timeout: 30000 });
  await page.screenshot({ path: `${outDir}/v2-${tag}-06-logistics-dashboard.png`, fullPage: true });
  console.error(`[${tag}] step: logistics dashboard done`);

  await browser.close();
  return errors;
}

const mobileErrors = await run({ width: 375, height: 812 }, 'mobile');

console.log('ERRORS_JSON_START');
console.log(JSON.stringify(mobileErrors, null, 2));
console.log('ERRORS_JSON_END');
