import pino from 'pino';

const logger = pino({ name: 'proxy-provider' });

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface ProxyProvider {
  getProxy(): Promise<ProxyConfig | null>;
  reportFailure(proxy: ProxyConfig): void;
}

export class NoOpProxyProvider implements ProxyProvider {
  async getProxy(): Promise<ProxyConfig | null> {
    return null;
  }

  reportFailure(_proxy: ProxyConfig): void {
    // No-op
  }
}

/**
 * Env-based proxy provider. Reads from PROXY_URL env var.
 * Supports formats:
 *   - http://host:port
 *   - http://user:pass@host:port
 *   - socks5://host:port
 */
export class EnvProxyProvider implements ProxyProvider {
  private failureCount = 0;
  private readonly maxFailures = 5;

  constructor(private proxyUrl: string) {}

  async getProxy(): Promise<ProxyConfig | null> {
    if (this.failureCount >= this.maxFailures) {
      logger.warn({ failures: this.failureCount }, 'Proxy disabled due to repeated failures');
      return null;
    }

    try {
      const url = new URL(this.proxyUrl);
      const config: ProxyConfig = {
        server: `${url.protocol}//${url.hostname}:${url.port || '8080'}`,
      };
      if (url.username) {
        config.username = decodeURIComponent(url.username);
        config.password = decodeURIComponent(url.password);
      }
      return config;
    } catch (err) {
      logger.error({ proxyUrl: this.proxyUrl, err }, 'Invalid proxy URL');
      return null;
    }
  }

  reportFailure(proxy: ProxyConfig): void {
    this.failureCount++;
    logger.warn({ server: proxy.server, failures: this.failureCount }, 'Proxy failure reported');
  }
}

/**
 * Rotating proxy provider. Cycles through a list of proxies,
 * skipping ones that have failed recently.
 */
export class RotatingProxyProvider implements ProxyProvider {
  private index = 0;
  private failures = new Map<string, { count: number; lastFailure: number }>();
  private readonly cooldownMs = 5 * 60 * 1000; // 5 min cooldown after failure

  constructor(private proxies: ProxyConfig[]) {
    if (proxies.length === 0) {
      throw new Error('RotatingProxyProvider requires at least one proxy');
    }
  }

  async getProxy(): Promise<ProxyConfig | null> {
    const now = Date.now();
    // Try each proxy in round-robin, skip failed ones still in cooldown
    for (let i = 0; i < this.proxies.length; i++) {
      const idx = (this.index + i) % this.proxies.length;
      const proxy = this.proxies[idx]!;
      const failure = this.failures.get(proxy.server);

      if (failure && failure.count >= 3 && now - failure.lastFailure < this.cooldownMs) {
        continue; // skip, still in cooldown
      }

      this.index = (idx + 1) % this.proxies.length;
      return proxy;
    }

    // All proxies in cooldown - reset and try first
    logger.warn('All proxies in cooldown, resetting failures');
    this.failures.clear();
    const proxy = this.proxies[this.index % this.proxies.length]!;
    this.index = (this.index + 1) % this.proxies.length;
    return proxy;
  }

  reportFailure(proxy: ProxyConfig): void {
    const existing = this.failures.get(proxy.server) ?? { count: 0, lastFailure: 0 };
    existing.count++;
    existing.lastFailure = Date.now();
    this.failures.set(proxy.server, existing);
    logger.warn({ server: proxy.server, failures: existing.count }, 'Proxy failure reported');
  }
}
