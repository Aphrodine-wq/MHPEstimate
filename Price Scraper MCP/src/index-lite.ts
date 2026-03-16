import { loadConfig } from './config.js';
import { BrowserManager } from './scraping/browser-manager.js';
import { ScraperEngine } from './scraping/scraper-engine.js';
import { HomeDepotAdapter } from './scraping/adapters/home-depot-adapter.js';
import { LowesAdapter } from './scraping/adapters/lowes-adapter.js';
import { NoOpProxyProvider, EnvProxyProvider } from './scraping/proxy/proxy-provider.js';
import { MemoryProductRepository } from './db/memory/memory-product-repository.js';
import { MemoryPriceRepository } from './db/memory/memory-price-repository.js';
import { MemoryStoreRepository } from './db/memory/memory-store-repository.js';
import { MemoryCacheManager } from './db/memory/memory-cache-manager.js';
import { createMcpServer, type Dependencies } from './server/mcp-server.js';
import { startStdioTransport } from './server/transports/stdio.js';
import pino from 'pino';

const logger = pino({ name: 'main-lite' });

async function main() {
  // 1. Load config (DATABASE_URL / REDIS_URL will have defaults but are unused)
  const config = loadConfig({ TRANSPORT: 'stdio' });
  logger.info('Lite mode — no PostgreSQL, no Redis, no BullMQ');

  // 2. Initialize BrowserManager with stealth + optional proxy
  const proxyProvider = config.PROXY_ENABLED && config.PROXY_URL
    ? new EnvProxyProvider(config.PROXY_URL)
    : new NoOpProxyProvider();
  const proxy = await proxyProvider.getProxy();
  const browserManager = new BrowserManager({
    headless: config.HEADLESS,
    proxy,
  });
  logger.info({ headless: config.HEADLESS, proxyEnabled: config.PROXY_ENABLED }, 'Browser manager configured');

  // 3. Initialize ScraperEngine + adapters (Home Depot & Lowe's only)
  const scraperEngine = new ScraperEngine(browserManager);
  scraperEngine.registerAdapter(new HomeDepotAdapter());
  scraperEngine.registerAdapter(new LowesAdapter());
  logger.info('Scraper engine initialized');

  // 4. Initialize in-memory repositories
  const productRepo = new MemoryProductRepository();
  const priceRepo = new MemoryPriceRepository();
  const storeRepo = new MemoryStoreRepository();

  // 5. Initialize in-memory cache
  const cache = new MemoryCacheManager(config.CACHE_TTL_SECONDS);

  // 6. Build dependencies container
  // Memory implementations match the method signatures of the DB-backed ones;
  // the cast is needed because TypeScript's private fields are nominal.
  const deps = {
    scraperEngine,
    productRepo,
    priceRepo,
    storeRepo,
    cache,
  } as unknown as Dependencies;

  // 7. Create MCP server + register tools
  const server = createMcpServer(deps);

  // 8. Start stdio transport
  await startStdioTransport(server);
  logger.info('Lite MCP server running on stdio');

  // 9. Graceful shutdown — just close the browser, no DB/Redis to tear down
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    await browserManager.close();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start lite server');
  process.exit(1);
});
