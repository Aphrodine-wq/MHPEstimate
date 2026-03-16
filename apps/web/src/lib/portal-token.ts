import { createHmac, randomBytes, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.PORTAL_SECRET;
  if (!secret) {
    throw new Error(
      "PORTAL_SECRET environment variable is required. " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return secret;
}

/**
 * Token TTL in milliseconds.
 * Portal links are valid for 7 days — long enough for a client to act,
 * short enough to limit exposure if a link leaks.
 */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a portal token for an estimate.
 *
 * The token encodes the estimate ID, an expiry timestamp, and a random nonce
 * so that:
 * 1. Each generation produces a unique token (nonce prevents replay/brute-force).
 * 2. Tokens cannot be forged without the SECRET.
 * 3. Expired tokens are rejected server-side regardless of HMAC validity.
 *
 * Format: `<expiryTimestampMs>.<nonce>.<hmac(estimateId:expiryTimestampMs:nonce)>`
 */
export function generatePortalToken(estimateId: string): string {
  const secret = getSecret();
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${estimateId}:${expiresAt}:${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${expiresAt}.${nonce}.${sig}`;
}

/**
 * Verify a portal token against the given estimate ID.
 *
 * Uses `timingSafeEqual` to prevent timing-based side-channel attacks.
 * Returns `false` for expired tokens, malformed tokens, or wrong signatures.
 */
export function verifyPortalToken(token: string, estimateId: string): boolean {
  try {
    const secret = getSecret();

    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [expiresAtStr, nonce, sig] = parts;
    if (!expiresAtStr || !nonce || !sig) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) return false;

    // Reject expired tokens
    if (Date.now() > expiresAt) return false;

    // Recompute expected signature for this estimate + expiry + nonce
    const payload = `${estimateId}:${expiresAtStr}:${nonce}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");

    if (sigBuf.length !== expectedBuf.length) {
      // Lengths differ — compare sigBuf against a same-length dummy to avoid
      // leaking length information via short-circuit timing.
      const dummy = Buffer.alloc(sigBuf.length, 0);
      timingSafeEqual(sigBuf, dummy);
      return false;
    }

    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function getPortalUrl(estimateId: string): string {
  const token = generatePortalToken(estimateId);

  let base: string;
  if (process.env.NEXT_PUBLIC_APP_URL) {
    base = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.VERCEL_URL) {
    base = `https://${process.env.VERCEL_URL}`;
  } else {
    base = "http://localhost:3000";
  }

  return `${base}/portal/${estimateId}?token=${token}`;
}
