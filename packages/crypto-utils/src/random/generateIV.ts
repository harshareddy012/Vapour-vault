import crypto from 'crypto';

/**
 * Generates a 96-bit (12-byte) initialization vector suitable for AES-GCM.
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(12);
}
