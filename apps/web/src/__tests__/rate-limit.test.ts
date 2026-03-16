import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "../lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("check (legacy API)", () => {
    it("allows requests under the limit", async () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });
      await expect(limiter.check(5, "user-1")).resolves.toBeUndefined();
    });

    it("rejects requests over the limit", async () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      // Use up all 3 allowed requests
      await limiter.check(3, "user-1");
      await limiter.check(3, "user-1");
      await limiter.check(3, "user-1");

      // 4th should fail
      await expect(limiter.check(3, "user-1")).rejects.toThrow("Rate limit exceeded");
    });

    it("resets after the interval", async () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      // Use up all requests
      await limiter.check(1, "user-1");
      await expect(limiter.check(1, "user-1")).rejects.toThrow("Rate limit exceeded");

      // Advance time past the window
      vi.advanceTimersByTime(61_000);

      // Should work again
      await expect(limiter.check(1, "user-1")).resolves.toBeUndefined();
    });

    it("tracks different tokens independently", async () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      await limiter.check(1, "user-1");
      await expect(limiter.check(1, "user-1")).rejects.toThrow("Rate limit exceeded");

      // Different user should still work
      await expect(limiter.check(1, "user-2")).resolves.toBeUndefined();
    });
  });

  describe("consume (new API)", () => {
    it("returns success with remaining count", () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      const result = limiter.consume("user-1", 5, 60_000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("returns failure when over limit", () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      limiter.consume("user-1", 2, 60_000);
      limiter.consume("user-1", 2, 60_000);

      const result = limiter.consume("user-1", 2, 60_000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("provides resetAt timestamp", () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 100 });

      const result = limiter.consume("user-1", 5, 60_000);
      expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
    });

    it("evicts oldest token when capacity is reached", () => {
      const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 2 });

      // Fill capacity
      limiter.consume("user-1", 5, 60_000);
      limiter.consume("user-2", 5, 60_000);

      // This should evict user-1
      limiter.consume("user-3", 5, 60_000);

      // user-1's history should be gone, so it gets a fresh slate
      const result = limiter.consume("user-1", 1, 60_000);
      expect(result.success).toBe(true);
    });
  });
});
