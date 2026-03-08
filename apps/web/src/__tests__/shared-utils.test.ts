/**
 * Tests for shared utility functions from @mhp/shared.
 * Located in apps/web tests due to filesystem constraints on packages/shared/__tests__.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  timeAgo,
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
  truncate,
  debounce,
  generateId,
} from "@proestimate/shared/utils";

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for current time", () => {
    expect(timeAgo("2026-03-07T12:00:00Z")).toBe("just now");
  });

  it("returns 'just now' for future dates", () => {
    expect(timeAgo("2026-03-07T13:00:00Z")).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(timeAgo("2026-03-07T11:45:00Z")).toBe("15m ago");
  });

  it("returns hours ago", () => {
    expect(timeAgo("2026-03-07T09:00:00Z")).toBe("3h ago");
  });

  it("returns days ago", () => {
    expect(timeAgo("2026-03-05T12:00:00Z")).toBe("2d ago");
  });

  it("returns weeks ago", () => {
    expect(timeAgo("2026-02-21T12:00:00Z")).toBe("2w ago");
  });

  it("returns formatted date for old dates", () => {
    const result = timeAgo("2025-01-01T00:00:00Z");
    expect(result).not.toContain("ago");
  });
});

describe("formatCurrency", () => {
  it("formats whole numbers", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("formats decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-500)).toBe("-$500.00");
  });
});

describe("formatPercent", () => {
  it("formats decimal as percentage", () => {
    expect(formatPercent(0.325)).toBe("32.5%");
  });

  it("formats with custom decimals", () => {
    expect(formatPercent(0.3333, 2)).toBe("33.33%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    const result = formatDate("2026-03-07T14:30:00Z");
    expect(result).toContain("Mar");
    expect(result).toContain("2026");
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    expect(truncate("hello world this is long", 10)).toBe("hello wor…");
  });
});

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("delays function execution", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resets delay on repeated calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
