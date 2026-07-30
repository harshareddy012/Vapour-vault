import crypto from 'crypto';

/**
 * Generates a cryptographically secure random 256-bit (32-byte) AES key.
 */
export function generateKey(): Buffer {
  return crypto.randomBytes(32);
}
