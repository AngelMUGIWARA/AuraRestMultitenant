import { chromium } from 'file:///C:/Users/ameri/AppData/Roaming/npm/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';

const SHOTS = 'C:/Proyectos/noveno/AuraRestMultitenant/verify-screenshots';
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Log all navigations
page.on('framenavigated', frame => {
  if (frame === page.mainFrame()) console.log(`  🔀 navigated → ${frame.url()}`);
});
page.on('console', msg => {
  if (msg.type() === 'error') console.log(`  🔴 console.error: ${msg.text().slice(0, 120)}`);
});

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`  📸 ${name}.png  [URL: ${page.url()}]`);
}

// ─── 1. Login ────────────────────────────────────────────────────
console.log('\n─── 1. Login ───');
await page.goto('http://localhost:3030/auth/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 10000 });
await page.locator('input[placeholder="mi-restaurante"]').fill('demo');
await page.locator('input[type="email"]').fill('admin@demo.com');
await page.locator('input[type="password"]').fill('Admin123');
await page.locator('button[type="submit"]').click();

// Espera redirect
await page.waitForURL(u => !u.href.includes('/auth/login'), { timeout: 10000 });
console.log(`  URL post-login: ${page.url()}`);

// ─── 2. Estado de localStorage después del login ──────────────────
const token = await page.evaluate(() => localStorage.getItem('maison_access_token'));
const refreshToken = await page.evaluate(() => localStorage.getItem('maison_refresh_token'));
console.log(`  localStorage token: ${token ? token.slice(0, 40) + '...' : 'NULL'}`);
console.log(`  localStorage refresh: ${refreshToken ? 'present' : 'NULL'}`);

// ─── 3. Espera a que la página cargue del todo ────────────────────
console.log('\n─── 2. Esperando carga del dashboard ───');
await page.waitForLoadState('networkidle');
console.log(`  URL tras networkidle: ${page.url()}`);
await shot('dbg-01-post-login');

// ─── 4. Navega directamente a /dashboard con el token presente ───
console.log('\n─── 3. Goto /dashboard explícito ───');
await page.goto('http://localhost:3030/dashboard', { waitUntil: 'networkidle' });
const tokenAfter = await page.evaluate(() => localStorage.getItem('maison_access_token'));
console.log(`  URL: ${page.url()}`);
console.log(`  token en localStorage: ${tokenAfter ? tokenAfter.slice(0, 40) + '...' : 'NULL'}`);

// Espera hasta que haya algo más que el skeleton
await page.waitForTimeout(5000);
console.log(`  URL tras 5s: ${page.url()}`);
await shot('dbg-02-dashboard');

const bodyText = (await page.locator('body').innerText()).replace(/\n+/g, ' ').trim();
console.log(`  Body (primeros 300): ${bodyText.slice(0, 300)}`);

// ─── 5. Inspección del DOM ────────────────────────────────────────
const title = await page.title();
const h1s = await page.locator('h1, h2').allInnerTexts();
console.log(`  Title: ${title}`);
console.log(`  Headings: ${JSON.stringify(h1s.slice(0, 5))}`);

// ─── 6. Revisa si federation cargó el remote ─────────────────────
const federationLoaded = await page.evaluate(() => {
  return typeof window.__federation_shared_react !== 'undefined'
    || typeof window.__mf_module_cache__ !== 'undefined';
});
console.log(`  Module Federation en window: ${federationLoaded}`);

await browser.close();
