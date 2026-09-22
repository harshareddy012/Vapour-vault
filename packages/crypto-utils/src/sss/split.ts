import crypto from 'crypto';
import { SecretShare } from '@dfs-sss/shared-types';
import { gfMult, EXP, LOG } from './gf256.js';
import { calculateSHA256 } from '../hash/sha256.js';

/**
 * Splits a secret key buffer into N shares with a K-of-N threshold over GF(2^8).
 *
 * Construction: for each byte b of the secret, build a random polynomial
 *   f(x) = b + a1*x + a2*x^2 + ... + a(K-1)*x^(K-1)   in GF(2^8)
 * and evaluate it at x = 1, 2, ..., N to produce the N shares.
 *
 * Reconstruction requires any K of those (x, f(x)) pairs via Lagrange
 * interpolation at x = 0.
 *
 * Security note: coefficients a1..a(K-1) are generated with
 * crypto.randomBytes() — a cryptographically secure PRNG — so that each
 * polynomial is indistinguishable from random to any adversary holding
 * fewer than K shares.
 */
export function splitSecret(secret: Buffer, k: number, n: number): SecretShare[] {
  if (k > n) throw new Error('Threshold K cannot be greater than total shares N.');
  if (k < 1 || n < 1) throw new Error('K and N must be positive integers.');
  if (n > 255) throw new Error('N cannot exceed 255 in GF(2^8).');

  // Allocate share buffers: shares[i] holds the i-th share bytes.
  const shares: Uint8Array[] = Array.from({ length: n }, () => new Uint8Array(secret.length));

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    // Build degree-(K-1) polynomial coefficients in GF(2^8).
    // coeff[0] = secret byte (the constant term, i.e. f(0)).
    // coeff[1..K-1] = cryptographically secure random bytes.
    const coeff = new Uint8Array(k);
    coeff[0] = secret[byteIdx];

    // Use crypto.randomBytes for coefficients — NOT Math.random().
    // This is required for information-theoretic security: if the coefficients
    // are predictable, an adversary can reconstruct the secret from fewer than
    // K shares by guessing the polynomial.
    const randomCoefficients = crypto.randomBytes(k - 1);
    for (let i = 1; i < k; i++) {
      coeff[i] = randomCoefficients[i - 1];
    }

    // Evaluate f(x) for x in 1..N using Horner's method in GF(2^8).
    for (let x = 1; x <= n; x++) {
      let y = coeff[0];
      let xPow = 1;
      for (let c = 1; c < k; c++) {
        xPow = gfMult(xPow, x);
        y ^= gfMult(coeff[c], xPow);
      }
      shares[x - 1][byteIdx] = y;
    }
  }

  return shares.map((shareData, idx) => {
    const shareHex = Buffer.from(shareData).toString('hex');
    return {
      index: idx + 1,
      share: shareHex,
      checksumSha256: calculateSHA256(shareHex),
    };
  });
}
