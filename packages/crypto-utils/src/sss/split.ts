import { SecretShare } from '@dfs-sss/shared-types';
import { calculateSHA256 } from '../hash/sha256.js';

// Precomputed GF(2^8) log/exp tables using irreducible polynomial 0x11b
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11b : 0);
  }
})();

export function gfMult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/**
 * Splits a secret key buffer into N shares with threshold K over GF(2^8).
 * Polynomial: f(x) = a0 + a1*x + a2*x^2 + ... + a_(K-1)*x^(K-1)
 * where a0 is the secret byte.
 */
export function splitSecret(secret: Buffer, k: number, n: number): SecretShare[] {
  if (k > n) throw new Error('Threshold K cannot be greater than total shares N.');
  if (k < 1 || n < 1) throw new Error('K and N must be positive integers.');
  if (n > 255) throw new Error('N cannot exceed 255 in GF(2^8).');

  const shares: Uint8Array[] = Array.from({ length: n }, () => new Uint8Array(secret.length));

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const a0 = secret[byteIdx];
    // Generate random coefficients for degree K-1 polynomial
    const coeff = new Uint8Array(k);
    coeff[0] = a0;
    for (let i = 1; i < k; i++) {
      coeff[i] = Math.floor(Math.random() * 256);
    }

    // Evaluate polynomial for each x in 1..N
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
