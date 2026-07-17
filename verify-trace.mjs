import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// Inject stack trace interceptor BEFORE any navigation
await page.addInitScript(() => {
  const orig = history.replaceState.bind(history);
  history.replaceState = function(state, title, url) {
    if (url && String(url).includes('auth/login')) {
      console.error('REDIRECT_TRACE:' + new Error('replaceState to auth/login').stack);
    }
    return orig(state, title, url);
  };
  const origPush = history.pushState.bind(history);
  history.pushState = function(state, title, url) {
    if (url && String(url).includes('auth/login')) {
      console.error('REDIRECT_TRACE:' + new Error('pushState to auth/login').stack);
    }
    return origPush(state, title, url);
  };
});

page.on('console', msg => {
  if (msg.text().startsWith('REDIRECT_TRACE:')) {
    console.log('\n🔍 STACK TRACE del redirect:');
    console.log(msg.text().replace('REDIRECT_TRACE:', ''));
  }
});

page.on('framenavigated', frame => {
  if (frame === page.mainFrame()) console.log(`🔀 nav → ${frame.url()}`);
});

// Login
await page.goto('http://localhost:3030/auth/login', { waitUntil: 'networkidle' });
await page.waitForSelector('input[placeholder="mi-restaurante"]', { timeout: 10000 });
await page.locator('input[placeholder="mi-restaurante"]').fill('demo');
await page.locator('input[type="email"]').fill('admin@demo.com');
await page.locator('input[type="password"]').fill('Admin123');
await page.locator('button[type="submit"]').click();
await page.waitForURL(u => !u.href.includes('/auth/login'), { timeout: 10000 });
console.log(`\nURL post-login: ${page.url()}`);

// Espera el redirect
await page.waitForTimeout(5000);
console.log(`URL final: ${page.url()}`);

await browser.close();
