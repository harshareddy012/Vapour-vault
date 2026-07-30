import crypto from 'crypto';

/**
 * Computes the SHA-256 hash of a buffer or string in hex format.
 */
export function calculateSHA256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
