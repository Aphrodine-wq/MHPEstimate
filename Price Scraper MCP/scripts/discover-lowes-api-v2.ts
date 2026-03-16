/**
 * Discovery v2: Try more Lowe's API endpoint patterns from the homepage session.
 * Also try to extract API routes from the JS bundles.
 */
import playwright from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const chromium = addExtra(playwright.chromium);
chromium.use(StealthPlugin());

async function discover() {
  const browser = await chromium.launch({
    headless: true,
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

  console.log('1. Establishing session on homepage...');
  await page.goto('https://www.lowes.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));
  console.log(`   Title: ${await page.title()}`);

  // Try a wide set of Lowe's API endpoints
  const endpoints = [
    // Search variations
    '/LowesSearchServices/resources/search/v2_0?Ntt=drill&maxResults=5',
    '/LowesSearchServices/resources/search/v1?Ntt=drill&maxResults=5',
    '/LowesSearchServices/resources/search?Ntt=drill&maxResults=5',
    '/LowesSearchServices/resources/search/v2_0?searchTerm=drill&maxResults=5',
    '/LowesSearchServices/resources/searchmodel/v2_0?Ntt=drill&maxResults=5',
    '/LowesSearchServices/resources/products/v2_0?Ntt=drill&maxResults=5',

    // Product listing
    '/pl/drill/4294857975',
    '/l/drill.html',

    // API gateways
    '/api/search?searchTerm=drill&maxResults=5',
    '/api/v1/search?searchTerm=drill&maxResults=5',
    '/api/product-search?searchTerm=drill&maxResults=5',

    // BFF patterns
    '/bff/search?searchTerm=drill&maxResults=5',
    '/gw/search?searchTerm=drill&maxResults=5',

    // Solr/Endeca patterns (Lowe's historically used Endeca)
    '/Ntt-drill?Ns=p_product_qty_sales_dollar|1&Nao=0',
    '/search?searchTerm=drill&offset=0&maxResults=5&storeId=2237',

    // Try the product detail API
    '/pd/api/product/5014148289',
    '/pd/5014148289/productdetail',

    // Newer patterns
    '/lowes-product-svc/v1/product/5014148289',
    '/lowes-product-svc/v1/search?searchTerm=drill&maxResults=5',

    // GraphQL
    '/graphql',
  ];

  for (const ep of endpoints) {
    const result = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        const text = await resp.text();
        return {
          status: resp.status,
          ok: resp.ok,
          contentType: resp.headers.get('content-type') ?? '',
          body: text.substring(0, 800),
        };
      } catch (e: any) {
        return { status: 0, ok: false, contentType: '', body: e.message };
      }
    }, ep);

    const isJson = result.contentType.includes('json');
    const marker = result.ok ? '✓' : result.status === 0 ? '✗' : '✗';
    console.log(`\n${marker} [${result.status}] ${ep}`);
    if (result.ok || isJson) {
      console.log(`  Content-Type: ${result.contentType}`);
      console.log(`  Body: ${result.body}`);
    }
  }

  // Try GraphQL POST
  console.log('\n\n=== TRYING GRAPHQL POST ===');
  const gqlEndpoints = ['/graphql', '/api/graphql', '/gateway/graphql'];
  for (const ep of gqlEndpoints) {
    const result = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: '{ __schema { queryType { name } } }',
          }),
        });
        const text = await resp.text();
        return { status: resp.status, body: text.substring(0, 500) };
      } catch (e: any) {
        return { status: 0, body: e.message };
      }
    }, ep);
    console.log(`[${result.status}] POST ${ep}: ${result.body.substring(0, 200)}`);
  }

  // Check JS bundles for API endpoint hints
  console.log('\n\n=== SCANNING JS BUNDLES FOR API PATTERNS ===');
  const scriptUrls = await page.$$eval('script[src]', (scripts) =>
    scripts.map((s) => s.getAttribute('src')).filter((s) => s && (s.includes('lowes') || s.startsWith('/'))),
  );
  console.log(`Found ${scriptUrls.length} JS bundle URLs`);

  // Look at the first few main bundles for API endpoint strings
  for (const scriptUrl of scriptUrls.slice(0, 5)) {
    if (!scriptUrl) continue;
    const fullUrl = scriptUrl.startsWith('http') ? scriptUrl : `https://www.lowes.com${scriptUrl}`;
    const result = await page.evaluate(async (url) => {
      try {
        const resp = await fetch(url);
        const text = await resp.text();
        // Search for API-like patterns
        const patterns = [
          ...text.matchAll(/["'](\/[a-zA-Z-]+(?:Services|api|svc|gateway)[^"'\s]{3,80})["']/g),
          ...text.matchAll(/["'](\/[a-zA-Z-]+\/(?:search|product|catalog)[^"'\s]{3,80})["']/g),
        ];
        return {
          url,
          size: text.length,
          matches: [...new Set(patterns.map((m) => m[1]))].slice(0, 20),
        };
      } catch (e: any) {
        return { url, size: 0, matches: [] as string[] };
      }
    }, fullUrl);

    if (result.matches.length > 0) {
      console.log(`\n${result.url} (${result.size} bytes):`);
      for (const m of result.matches) {
        console.log(`  ${m}`);
      }
    }
  }

  // Also check inline scripts
  console.log('\n\n=== SCANNING INLINE SCRIPTS FOR CONFIG/API ===');
  const inlineData = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script:not([src])');
    const results: string[] = [];
    for (const s of scripts) {
      const text = s.textContent ?? '';
      if (text.includes('api') || text.includes('API') || text.includes('endpoint') || text.includes('search')) {
        // Extract relevant lines
        const lines = text.split('\n').filter(
          (l) => l.includes('api') || l.includes('API') || l.includes('search') || l.includes('endpoint') || l.includes('gateway'),
        );
        if (lines.length > 0) {
          results.push(...lines.map((l) => l.trim()).slice(0, 5));
        }
      }
    }
    return results.slice(0, 30);
  });

  for (const line of inlineData) {
    console.log(`  ${line.substring(0, 200)}`);
  }

  // Check for __NEXT_DATA__ or similar state hydration
  console.log('\n\n=== CHECKING PAGE STATE/CONFIG ===');
  const pageState = await page.evaluate(() => {
    const w = globalThis as any;
    const result: Record<string, string> = {};

    // Check common state objects
    for (const key of ['__NEXT_DATA__', '__INITIAL_STATE__', '__APP_CONFIG__', '__PRELOADED_STATE__', 'lowesAppConfig', 'window.lowes']) {
      if (w[key]) {
        result[key] = JSON.stringify(w[key]).substring(0, 500);
      }
    }

    // Search for any global with "api" or "search" in value
    for (const key of Object.keys(w)) {
      if (key.startsWith('__') && typeof w[key] === 'object' && w[key] !== null) {
        const str = JSON.stringify(w[key]);
        if (str.includes('searchServices') || str.includes('SearchServices') || str.includes('product-svc')) {
          result[key] = str.substring(0, 500);
        }
      }
    }

    return result;
  });

  for (const [key, val] of Object.entries(pageState)) {
    console.log(`\n${key}:`);
    console.log(`  ${val}`);
  }

  await browser.close();
}

discover().catch(console.error);
