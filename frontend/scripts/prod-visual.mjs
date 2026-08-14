import { chromium } from 'playwright';

const BASE = 'https://obapay.up.railway.app';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForSelector('button:has-text("Create account")', { timeout: 20000 });
await page.screenshot({ path: 'C:/xampp/htdocs/obapay-logistics/frontend/scripts/screenshots/PROD-redesign-login.png' });
await browser.close();
console.log('done');
