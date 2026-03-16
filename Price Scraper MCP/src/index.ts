import { loadConfig } from './config.js';
import { getPool, closePool } from './db/connection.js';
import { getRedis, closeRedis } from './db/redis.js';
import { BrowserManager } from './scraping/browser-manager.js';
import { ScraperEngine } from './scraping/scraper-engine.js';
import { HomeDepotAdapter } from './scraping/adapters/home-depot-adapter.js';
import { LowesAdapter } from './scraping/adapters/lowes-adapter.js';
import { EnvProxyProvider, NoOpProxyProvider } from './scraping/proxy/proxy-provider.js';
import { ProductRepository } from './db/repositories/product-repository.js';
import { PriceRepository } from './db/repositories/price-repository.js';
import { StoreRepository } from './db/repositories/store-repository.js';
import { CacheManager } from './db/cache/cache-manager.js';
import { QueueManager } from './queue/queue-manager.js';
import { createScrapeProductProcessor } from './queue/jobs/scrape-product.js';
import { createScrapeSearchProcessor } from './queue/jobs/scrape-search.js';
import { createRefreshPricesProcessor } from './queue/jobs/refresh-prices.js';
import { createScrapeInventoryProcessor } from './queue/jobs/scrape-inventory.js';
import { setupPriceRefreshScheduler } from './queue/schedulers/price-refresh.js';
import { createMcpServer } from './server/mcp-server.js';
import { startStdioTransport } from './server/transports/stdio.js';
import { startHttpTransport } from './server/transports/http.js';
import pino from 'pino';

const logger = pino({ name: 'main' });

async function main() {
  // 1. Load & validate config
  const transportArg = process.argv.find((a) => a.startsWith('--transport'))
    ? process.argv[process.argv.indexOf('--transport') + 1]
    : undefined;

  const config = loadConfig(transportArg ? { TRANSPORT: transportArg } : undefined);
  logger.info({ transport: config.TRANSPORT }, 'Configuration loaded');

  // 2. Connect PostgreSQL
  const pool = getPool(config.DATABASE_URL);
  await pool.query('SELECT 1');
  logger.info('PostgreSQL connected');

  // 3. Connect Redis
  const redis = getRedis(config.REDIS_URL);
  await redis.ping();
  logger.info('Redis connected');

  // 4. Initialize BrowserManager with stealth + optional proxy
  const proxyProvider = config.PROXY_ENABLED && config.PROXY_URL
    ? new EnvProxyProvider(config.PROXY_URL)
    : new NoOpProxyProvider();
  const proxy = await proxyProvider.getProxy();
  const browserManager = new BrowserManager({
    headless: config.HEADLESS,
    proxy,
  });
  logger.info({ headless: config.HEADLESS, proxyEnabled: config.PROXY_ENABLED }, 'Browser manager configured with stealth');

  // 5. Initialize ScraperEngine + adapters
  const scraperEngine = new ScraperEngine(browserManager);
  scraperEngine.registerAdapter(new HomeDepotAdapter());
  scraperEngine.registerAdapter(new LowesAdapter());
  logger.info('Scraper engine initialized');

  // 6. Initialize Repositories
  const productRepo = new ProductRepository(pool);
  const priceRepo = new PriceRepository(pool);
  const storeRepo = new StoreRepository(pool);

  // 7. Initialize CacheManager
  const cache = new CacheManager(redis, config.CACHE_TTL_SECONDS);

  // 8. Initialize QueueManager + workers + schedulers
  const queueManager = new QueueManager({ connection: { host: new URL(config.REDIS_URL).hostname, port: parseInt(new URL(config.REDIS_URL).port || '6379') } });

  queueManager.registerWorker(
    'scrape-product',
    createScrapeProductProcessor(scraperEngine, productRepo, priceRepo),
    config.SCRAPE_CONCURRENCY,
  );
  queueManager.registerWorker(
    'scrape-search',
    createScrapeSearchProcessor(scraperEngine, productRepo, priceRepo),
    config.SCRAPE_CONCURRENCY,
  );
  queueManager.registerWorker(
    'refresh-prices',
    createRefreshPricesProcessor(pool, queueManager),
    1,
  );
  queueManager.registerWorker(
    'scrape-inventory',
    createScrapeInventoryProcessor(scraperEngine, productRepo),
    config.SCRAPE_CONCURRENCY,
  );

  await setupPriceRefreshScheduler(queueManager, config.PRICE_REFRESH_CRON);
  logger.info('Queue system initialized');

  // 9. Build Dependencies container
  const deps = {
    scraperEngine,
    productRepo,
    priceRepo,
    storeRepo,
    cache,
  };

  // 10. Create McpServer + register tools
  const server = createMcpServer(deps);

  // 11. Start transport
  if (config.TRANSPORT === 'http') {
    await startHttpTransport(server, config.HTTP_PORT);
  } else {
    await startStdioTransport(server);
  }

  // 12. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    await queueManager.close();
    await browserManager.close();
    await closeRedis();
    await closePool();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
