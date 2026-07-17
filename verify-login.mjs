import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'node:url';

const SHOTS = fileURLToPath(new URL('./verify-screenshots', import.meta.url));
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

async function testLogin(page, label, tenant, email, password, expectedPath) {
  console.log(`\n─── ${label} ───`);

  // 1. Navega a raíz — debe redirigir a /auth/login
  await page.goto('http://localhost:3030/', { waitUntil: 'networkidle' });
  const afterRoot = page.url();
  console.log(`  root → ${afterRoot}`);
  await shot(page, `${label}-01-root-redirect`);

  // 2. Verifica que estamos en /auth/login
  if (!afterRoot.includes('/auth/login')) {
    console.log(`  ❌ No redirigió a /auth/login (actual: ${afterRoot})`);
    return false;
  }
  console.log(`  ✅ Redirigió a /auth/login`);

  // 3. Comprueba que el MFE de auth cargó (espera el campo tenant)
  try {
    await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 8000 });
    console.log(`  ✅ MFE auth-mf cargó`);
  } catch {
    console.log(`  ❌ Timeout esperando el campo de tenant (MFE no cargó)`);
    await shot(page, `${label}-02-mfe-timeout`);
    return false;
  }

  // 4. Verifica los 3 campos
  const tenantField = page.locator('input[placeholder="mi-restaurante"]');
  const emailField  = page.locator('input[type="email"]');
  const passField   = page.locator('input[type="password"]');

  const [tOk, eOk, pOk] = await Promise.all([
    tenantField.isVisible(),
    emailField.isVisible(),
    passField.isVisible(),
  ]);
  console.log(`  Campos — tenant:${tOk} email:${eOk} password:${pOk}`);
  if (!tOk || !eOk || !pOk) { console.log(`  ❌ Faltan campos`); return false; }
  console.log(`  ✅ 3 campos presentes`);
  await shot(page, `${label}-02-form`);

  // 5. Rellena y envía
  await tenantField.fill(tenant);
  await emailField.fill(email);
  await passField.fill(password);
  await shot(page, `${label}-03-filled`);
  await page.locator('button[type="submit"]').click();

  // 6. Espera a que cambie la URL (redirect post-login)
  try {
    await page.waitForURL((url) => !url.href.includes('/auth/login'), { timeout: 8000 });
  } catch {
    // Si no cambió, captura el error visible
    const errorEl = page.locator('.text-maison-ruby, [class*="ruby"]');
    const errorText = await errorEl.first().textContent().catch(() => '(sin mensaje)');
    console.log(`  ❌ No hubo redirect. Error visible: "${errorText}"`);
    await shot(page, `${label}-04-error`);
    return false;
  }

  const finalUrl = page.url();
  const passed = finalUrl.includes(expectedPath);
  console.log(`  URL final: ${finalUrl}`);
  await shot(page, `${label}-04-final`);

  if (passed) {
    console.log(`  ✅ Redirigió a ${expectedPath}`);
  } else {
    console.log(`  ❌ Esperaba ${expectedPath}, got ${finalUrl}`);
  }

  // Limpia localStorage para el siguiente test
  await page.evaluate(() => localStorage.clear());
  return passed;
}

const page = await ctx.newPage();
const results = [];

results.push(await testLogin(page, 'ADMIN',  'demo', 'admin@demo.com',  'Admin123',  '/dashboard'));
results.push(await testLogin(page, 'WAITER', 'demo', 'mesero@demo.com', 'Mesero123', '/orders'));
results.push(await testLogin(page, 'CHEF',   'demo', 'chef@demo.com',   'Chef1234',  '/kitchen'));

// Prueba credenciales incorrectas
console.log('\n─── CREDS_MALAS ───');
await page.goto('http://localhost:3030/auth/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 8000 });
await page.locator('input[placeholder="mi-restaurante"]').fill('demo');
await page.locator('input[type="email"]').fill('admin@demo.com');
await page.locator('input[type="password"]').fill('WrongPass1');
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(2000);
const stayedOnLogin = page.url().includes('/auth/login');
const errorEl = page.locator('[class*="ruby"]');
const errMsg = await errorEl.first().textContent().catch(() => '');
console.log(`  URL tras creds malas: ${page.url()}`);
console.log(`  Mensaje de error: "${errMsg}"`);
await shot(page, 'CREDS_MALAS-error');
results.push(stayedOnLogin && errMsg.length > 0);
console.log(stayedOnLogin && errMsg.length > 0 ? '  ✅ Muestra error y no redirige' : '  ❌ No se comporta bien con creds malas');

await browser.close();

console.log('\n══════════════════════════════');
const all = results.every(Boolean);
console.log(all ? '✅  TODOS LOS TESTS PASARON' : '❌  ALGÚN TEST FALLÓ');
console.log('Screenshots en:', SHOTS);
process.exit(all ? 0 : 1);
