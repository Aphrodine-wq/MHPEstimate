export const PRICE_FRESHNESS_THRESHOLDS = {
  green: 30,   // 0-30 days: use confidently
  yellow: 60,  // 31-60 days: use with note
  orange: 90,  // 61-90 days: trigger re-scrape, warn
  red: 91,     // 90+ days: do not auto-populate
} as const;
