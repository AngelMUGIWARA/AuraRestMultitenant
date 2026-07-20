import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'node:url';

const SHOTS = fileURLToPath(new URL('./verify-screenshots', import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Intercept ALL history API calls
await page.addInitScript(() => {
  const origReplace = history.replaceState.bind(history);
  const origPush = history.pushState.bind(history);
  history.replaceState = function(state, title, url) {
    console.log('__HISTORY__:replaceState:' + url);
    if (url && String(url).includes('auth/login')) {
      console.error('__REDIRECT__:replaceState to auth/login\n' + new Error().stack);
    }
    return origReplace(state, title, url);
  };
  history.pushState = function(state, title, url) {
    console.log('__HISTORY__:pushState:' + url);
    if (url && String(url).includes('auth/login')) {
      console.error('__REDIRECT__:pushState to auth/login\n' + new Error().stack);
    }
    return origPush(state, title, url);
  };
});

const logs = [];
page.on('console', msg => {
  const text = msg.text();
  const prefix = msg.type() === 'error' ? '🔴' : '📝';
  logs.push(`${prefix} [${msg.type()}] ${text.slice(0, 200)}`);
  if (text.startsWith('__HISTORY__') || text.startsWith('__REDIRECT__')) {
    console.log(`  ${prefix} ${text.slice(0, 300)}`);
  }
});
page.on('pageerror', err => {
  logs.push(`💥 [pageerror] ${err.message}`);
  console.log(`  💥 ${err.message.slice(0, 200)}`);
});
page.on('framenavigated', frame => {
  if (frame === page.mainFrame()) {
    console.log(`  🔀 NAV → ${frame.url()}`);
  }
});

// Intercept failed requests
const failedRequests = [];
page.on('requestfailed', req => {
  failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
});
page.on('response', async resp => {
  const url = resp.url();
  if (url.includes('localhost:4000')) {
    const status = resp.status();
    if (status >= 400) {
      console.log(`  ⚠️  API ${resp.status()} ${resp.request().method()} ${url.replace('http://localhost:4000/api/v1', '')}`);
    }
  }
});

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`  📸 ${name}.png`);
}

// ─── 1. Login como ADMIN ───────────────────────────────────────────
console.log('\n═══ 1. LOGIN ═══');
await page.goto('http://localhost:3030/auth/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 10000 });

await page.locator('input[placeholder="mi-restaurante"]').fill('demo');
await page.locator('input[type="email"]').fill('admin@demo.com');
await page.locator('input[type="password"]').fill('Admin123');
await shot('01-login-form');

await page.locator('button[type="submit"]').click();
console.log('  Esperando redirect post-login...');

try {
  await page.waitForURL(u => !u.href.includes('/auth/login'), { timeout: 10000 });
  console.log(`  ✅ URL post-login: ${page.url()}`);
} catch {
  console.log(`  ❌ No hubo redirect. URL: ${page.url()}`);
  await shot('01-no-redirect');
  await browser.close();
  process.exit(1);
}

await shot('02-post-login');

// ─── 2. Esperar que el dashboard cargue y observar ─────────────────
console.log('\n═══ 2. DASHBOARD ═══');
const token = await page.evaluate(() => localStorage.getItem('maison_access_token'));
console.log(`  Token en localStorage: ${token ? token.slice(0,50) + '...' : 'NULL'}`);

// Verificar tenantSlug en JWT
if (token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log(`  JWT payload: role=${payload.role}, tenantSlug=${payload.tenantSlug}`);
}

// Esperar 8 segundos con snapshots periódicos
for (let i = 1; i <= 4; i++) {
  await page.waitForTimeout(2000);
  const url = page.url();
  console.log(`  [t=${i*2}s] URL: ${url}`);
  if (url.includes('auth/login')) {
    console.log('  ⚠️  REDIRECT A AUTH/LOGIN DETECTADO');
    await shot(`03-redirect-at-t${i*2}`);
    break;
  }
}

await shot('03-dashboard-final');
const bodyText = (await page.locator('body').innerText()).replace(/\n+/g, ' ').trim();
console.log(`  Body (300 chars): ${bodyText.slice(0, 300)}`);

const headings = await page.locator('h1, h2, h3').allInnerTexts();
console.log(`  Headings: ${JSON.stringify(headings.slice(0, 5))}`);

// ─── 3. Navegar a /orders ──────────────────────────────────────────
console.log('\n═══ 3. /orders ═══');
await page.goto('http://localhost:3030/orders', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
console.log(`  URL: ${page.url()}`);
await shot('04-orders');
const ordersText = (await page.locator('body').innerText()).replace(/\n+/g, ' ').trim();
console.log(`  Body: ${ordersText.slice(0, 200)}`);

// ─── 4. Resumen ────────────────────────────────────────────────────
console.log('\n═══ RESUMEN CONSOLA ═══');
const errors = logs.filter(l => l.startsWith('🔴') || l.startsWith('💥'));
console.log(`  ${errors.length} errores totales`);
errors.slice(0, 10).forEach(e => console.log(`  ${e}`));

await browser.close();
console.log('\nScreenshots en:', SHOTS);
