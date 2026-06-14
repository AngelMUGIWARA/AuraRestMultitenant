import { chromium } from 'file:///C:/Users/ameri/AppData/Roaming/npm/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';

const SHOTS = 'C:/Proyectos/noveno/AuraRestMultitenant/verify-screenshots';
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Capture console errors
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push(err.message));

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

console.log('\n─── 1. Login como ADMIN ───');
await page.goto('http://localhost:3030/auth/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 10000 });
await page.locator('input[placeholder="mi-restaurante"]').fill('demo');
await page.locator('input[type="email"]').fill('admin@demo.com');
await page.locator('input[type="password"]').fill('Admin123');
await page.locator('button[type="submit"]').click();

await page.waitForURL(url => !url.href.includes('/auth/login'), { timeout: 10000 });
console.log(`  ✅ Redirigido a: ${page.url()}`);

console.log('\n─── 2. Dashboard cargando ───');
// Espera a que el skeleton desaparezca o aparezca contenido real
await page.waitForTimeout(4000);
await shot('dash-01-initial');

// Verifica si hay contenido visible (no solo skeleton)
const bodyText = await page.locator('body').innerText();
const hasContent = bodyText.trim().length > 50;
console.log(`  Texto en página: ${bodyText.slice(0, 200).replace(/\n+/g, ' ')}`);
console.log(hasContent ? '  ✅ Hay contenido en el dashboard' : '  ⚠️  Página parece vacía');

// Espera más tiempo por si el MFE tarda en federarse
await page.waitForTimeout(4000);
await shot('dash-02-after-wait');
const bodyText2 = await page.locator('body').innerText();
console.log(`  Texto tras espera: ${bodyText2.slice(0, 300).replace(/\n+/g, ' ')}`);

console.log('\n─── 3. Consola JS ───');
if (consoleErrors.length === 0) {
  console.log('  ✅ Sin errores de consola');
} else {
  console.log(`  ⚠️  ${consoleErrors.length} error(es):`);
  consoleErrors.slice(0, 5).forEach(e => console.log(`    • ${e.slice(0, 120)}`));
}

// Screenshot final completo
await shot('dash-03-full');

console.log('\n─── 4. Navegación a /orders ───');
await page.goto('http://localhost:3030/orders', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await shot('dash-04-orders');
const ordersText = await page.locator('body').innerText();
console.log(`  Texto: ${ordersText.slice(0, 200).replace(/\n+/g, ' ')}`);

await browser.close();
console.log('\nScreenshots en:', SHOTS);
