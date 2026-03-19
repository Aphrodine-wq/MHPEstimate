/**
 * Token encryption/decryption using AES-256-GCM.
 * Used to encrypt OAuth access/refresh tokens before storing in DB.
 *
 * Requires INTEGRATION_ENCRYPTION_KEY env var (32-byte hex string, i.e. 64 hex chars).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'Missing INTEGRATION_ENCRYPTION_KEY environment variable. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  if (hex.length !== 64) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${hex.length} characters.`,
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext token. Returns "iv:ciphertext:authTag" (all base64).
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;
}

/**
 * Decrypt an encrypted token string (format: "iv:ciphertext:authTag").
 * Throws if the auth tag is invalid (tampered ciphertext).
 */
export function decryptToken(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format. Expected "iv:ciphertext:authTag" (base64-encoded).');
  const iv = Buffer.from(parts[0]!, 'base64');
  const ciphertext = Buffer.from(parts[1]!, 'base64');
  const authTag = Buffer.from(parts[2]!, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
