const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  });
  const page = await context.newPage();
  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}]`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.log('[pageerror]', err.message);
  });
  page.on('requestfailed', (req) => {
    console.log('[requestfailed]', req.url(), req.failure());
  });

  console.log('Navigating to login page...');
  await page.goto('http://127.0.0.1:15002/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Page loaded, waiting for stability...');
  await page.waitForTimeout(5000);

  const title = await page.title();
  console.log('Page title:', title);

  await page.screenshot({ path: 'scripts/login-page.png', fullPage: true });
  console.log('Screenshot saved to scripts/login-page.png');

  await browser.close();
})();
