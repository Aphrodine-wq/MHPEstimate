import playwright from 'playwright';
import { addExtra } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext } from 'playwright';
import type { ProxyConfig } from './proxy/proxy-provider.js';
import pino from 'pino';

const logger = pino({ name: 'browser-manager' });

// Wrap playwright's chromium with stealth plugin
const chromium = addExtra(playwright.chromium);
chromium.use(StealthPlugin());

// Realistic Chrome user-agents (rotated per context)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

// Common screen resolutions to rotate
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

interface ContextEntry {
  context: BrowserContext;
  lastUsed: number;
}

export interface BrowserManagerOptions {
  headless?: boolean;
  proxy?: ProxyConfig | null;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private contexts = new Map<string, ContextEntry>();
  private readonly maxContexts = 6;
  private readonly contextTtlMs = 10 * 60 * 1000; // 10 minutes
  private options: BrowserManagerOptions;

  constructor(options?: BrowserManagerOptions) {
    this.options = {
      headless: true,
      proxy: null,
      ...options,
    };
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      logger.info({ headless: this.options.headless }, 'Launching stealth browser');

      const launchOptions: Record<string, unknown> = {
        headless: this.options.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      };

      if (this.options.proxy) {
        launchOptions.proxy = {
          server: this.options.proxy.server,
          username: this.options.proxy.username,
          password: this.options.proxy.password,
        };
        logger.info({ server: this.options.proxy.server }, 'Using proxy');
      }

      this.browser = await chromium.launch(launchOptions);
    }
    return this.browser;
  }

  async getContext(key: string): Promise<BrowserContext> {
    // Clean expired contexts
    this.cleanExpiredContexts();

    const existing = this.contexts.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.context;
    }

    // Evict oldest if at capacity
    if (this.contexts.size >= this.maxContexts) {
      let oldestKey = '';
      let oldestTime = Infinity;
      for (const [k, v] of this.contexts) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        const old = this.contexts.get(oldestKey);
        await old?.context.close();
        this.contexts.delete(oldestKey);
      }
    }

    const browser = await this.getBrowser();
    const userAgent = pickRandom(USER_AGENTS);
    const viewport = pickRandom(VIEWPORTS);
    const timezone = pickRandom(TIMEZONES);

    const context = await browser.newContext({
      viewport,
      userAgent,
      locale: 'en-US',
      timezoneId: timezone,
      // Realistic browser headers
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': userAgent.includes('Windows') ? '"Windows"' : userAgent.includes('Mac') ? '"macOS"' : '"Linux"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // Additional stealth: override navigator properties that the plugin might miss
    await context.addInitScript(() => {
      // Mask webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // Realistic plugins array
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ];
          // @ts-ignore
          arr.refresh = () => {};
          return arr;
        },
      });

      // Fake languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Fake hardware concurrency (realistic range)
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
      });

      // Fake device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
      });

      // Prevent detection of automation via permissions
      const nav = navigator as any;
      if (nav.permissions?.query) {
        const originalQuery = nav.permissions.query.bind(nav.permissions);
        nav.permissions.query = (parameters: any) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: 'prompt' });
          }
          return originalQuery(parameters);
        };
      }

      // Add chrome runtime object
      const w = globalThis as any;
      if (!w.chrome) w.chrome = {};
      if (!w.chrome.runtime) w.chrome.runtime = {};
    });

    logger.debug({ key, viewport, timezone, ua: userAgent.substring(0, 40) }, 'Created stealth browser context');
    this.contexts.set(key, { context, lastUsed: Date.now() });
    return context;
  }

  private cleanExpiredContexts(): void {
    const now = Date.now();
    for (const [key, entry] of this.contexts) {
      if (now - entry.lastUsed > this.contextTtlMs) {
        entry.context.close().catch(() => {});
        this.contexts.delete(key);
      }
    }
  }

  async close(): Promise<void> {
    for (const [, entry] of this.contexts) {
      await entry.context.close().catch(() => {});
    }
    this.contexts.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    logger.info('Browser manager closed');
  }
}
