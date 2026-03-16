import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/price_scraper'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(3600),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  SCRAPE_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  PRICE_REFRESH_CRON: z.string().default('0 */6 * * *'),
  PROXY_ENABLED: z.coerce.boolean().default(false),
  PROXY_URL: z.string().optional(),
  HEADLESS: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(overrides?: Partial<Record<string, string>>): Config {
  const raw = { ...process.env, ...overrides };
  return configSchema.parse(raw);
}
