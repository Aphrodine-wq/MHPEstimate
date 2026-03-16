/**
 * Discovery script: Intercept Lowe's internal API calls during a search.
 * Run with: npx tsx scripts/discover-lowes-api.ts
 */
import playwright from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const chromium = addExtra(playwright.chromium);
chromium.use(StealthPlugin());

async function discover() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  // Capture all API-like requests
  const apiCalls: { method: string; url: string; postData?: string; status?: number; body?: string }[] = [];

  page.on('request', (req) => {
    const url = req.url();
    // Capture JSON/API requests (skip images, css, fonts, etc.)
    if (
      (url.includes('/api/') ||
        url.includes('/gateway/') ||
        url.includes('/graphql') ||
        url.includes('/search') ||
        url.includes('SearchServices') ||
        url.includes('/rnr/') ||
        url.includes('/wcm/')) &&
      !url.includes('.js') &&
      !url.includes('.css') &&
      !url.includes('.png') &&
      !url.includes('.jpg')
    ) {
      apiCalls.push({
        method: req.method(),
        url,
        postData: req.postData() ?? undefined,
      });
    }
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    const matching = apiCalls.find((c) => c.url === url && !c.status);
    if (matching) {
      matching.status = resp.status();
      try {
        const ct = resp.headers()['content-type'] ?? '';
        if (ct.includes('json')) {
          const body = await resp.text();
          matching.body = body.substring(0, 2000); // truncate for readability
        }
      } catch { /* ignore */ }
    }
  });

  console.log('1. Navigating to lowes.com homepage...');
  await page.goto('https://www.lowes.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`   Page title: ${await page.title()}`);
  console.log(`   URL: ${page.url()}`);

  // Wait for page to stabilize
  await new Promise((r) => setTimeout(r, 3000));

  console.log('\n2. Looking for search input...');
  const searchSelectors = [
    'input#search-query',
    'input[name="searchTerm"]',
    'input[type="search"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="search"]',
    'input[aria-label*="Search"]',
    'input[aria-label*="search"]',
    '#headerSearch input',
    '.search-input',
  ];

  let searchInput = null;
  for (const sel of searchSelectors) {
    searchInput = await page.$(sel);
    if (searchInput) {
      console.log(`   Found search input: ${sel}`);
      break;
    }
  }

  if (!searchInput) {
    console.log('   Could not find search input, listing all inputs:');
    const inputs = await page.$$eval('input', (els) =>
      els.map((el) => ({
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        className: el.className.substring(0, 80),
      })),
    );
    console.log(JSON.stringify(inputs, null, 2));
  }

  if (searchInput) {
    console.log('\n3. Typing search query "drill"...');
    await searchInput.click();
    await new Promise((r) => setTimeout(r, 500));
    await searchInput.type('drill', { delay: 80 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('\n4. Submitting search...');
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 5000));

    console.log(`   Post-search URL: ${page.url()}`);
    console.log(`   Post-search title: ${await page.title()}`);
  }

  console.log('\n=== API CALLS CAPTURED ===');
  for (const call of apiCalls) {
    console.log(`\n${call.method} ${call.url}`);
    if (call.status) console.log(`  Status: ${call.status}`);
    if (call.postData) console.log(`  Post data: ${call.postData.substring(0, 500)}`);
    if (call.body) console.log(`  Response: ${call.body.substring(0, 500)}`);
  }

  console.log(`\nTotal API calls captured: ${apiCalls.length}`);

  // Also try known endpoints directly via fetch from the page context
  console.log('\n=== TRYING KNOWN ENDPOINTS ===');

  const endpoints = [
    { name: 'Search v2', url: '/LowesSearchServices/resources/search/v2?Ntt=drill&maxResults=5' },
    { name: 'Product Search', url: '/rnr/gateway/v1/product-search/search?searchTerm=drill&maxResults=5' },
    { name: 'Search Gateway', url: '/rnr/gateway/v1/search?searchTerm=drill&maxResults=5' },
    { name: 'WCM Search', url: '/wcm/connect/search?searchTerm=drill&maxResults=5' },
  ];

  for (const ep of endpoints) {
    const result = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });
        const text = await resp.text();
        return { status: resp.status, body: text.substring(0, 500), ok: resp.ok };
      } catch (e: any) {
        return { status: 0, body: e.message, ok: false };
      }
    }, ep.url);

    console.log(`\n${ep.name}: ${ep.url}`);
    console.log(`  Status: ${result.status}, OK: ${result.ok}`);
    console.log(`  Response: ${result.body}`);
  }

  await new Promise((r) => setTimeout(r, 2000));
  await browser.close();
}

discover().catch(console.error);
