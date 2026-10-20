import { describe, expect, it } from 'vitest';
import { EXP, LOG, gfDiv, gfMult } from './gf256.js';
import { splitSecret } from './split.js';
import { combineShares } from './combine.js';
import crypto from 'crypto';

describe('GF(2^8) Finite Field Arithmetic', () => {
  it('generates a valid field with 255 non-zero elements and generator 0x03', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 255; i++) {
      expect(EXP[i]).toBeGreaterThan(0);
      expect(EXP[i]).toBeLessThanOrEqual(255);
      seen.add(EXP[i]);
    }
    expect(seen.size).toBe(255);
    expect(EXP[0]).toBe(1);
    expect(EXP[255]).toBe(EXP[0]); // Period is 255
  });

  it('satisfies identity and zero properties for multiplication', () => {
    for (let a = 0; a < 256; a++) {
      expect(gfMult(a, 0)).toBe(0);
      expect(gfMult(0, a)).toBe(0);
      expect(gfMult(a, 1)).toBe(a);
      expect(gfMult(1, a)).toBe(a);
    }
  });

  it('satisfies commutativity and distributivity', () => {
    for (let i = 0; i < 50; i++) {
      const a = crypto.randomInt(0, 256);
      const b = crypto.randomInt(0, 256);
      const c = crypto.randomInt(0, 256);

      // Commutativity
      expect(gfMult(a, b)).toBe(gfMult(b, a));

      // Distributivity: a * (b XOR c) = (a * b) XOR (a * c)
      expect(gfMult(a, b ^ c)).toBe(gfMult(a, b) ^ gfMult(a, c));
    }
  });

  it('satisfies division as the inverse of multiplication', () => {
    for (let a = 0; a < 256; a++) {
      for (let b = 1; b < 256; b++) {
        const product = gfMult(a, b);
        expect(gfDiv(product, b)).toBe(a);
      }
    }
  });

  it('throws on division by zero', () => {
    expect(() => gfDiv(42, 0)).toThrow('Division by zero');
  });
});

describe('Shamir Secret Sharing (3-of-5 threshold)', () => {
  const K = 3;
  const N = 5;

  it('reconstructs the exact secret from all 10 possible combinations of 3 shares', () => {
    const secret = crypto.randomBytes(32); // 256-bit AES key
    const shares = splitSecret(secret, K, N);
    expect(shares).toHaveLength(5);

    // Generate all 10 combinations of 3 choose 5
    const combinations: number[][] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        for (let k = j + 1; k < N; k++) {
          combinations.push([i, j, k]);
        }
      }
    }
    expect(combinations).toHaveLength(10);

    for (const [idx1, idx2, idx3] of combinations) {
      const subset = [shares[idx1], shares[idx2], shares[idx3]];
      const recovered = combineShares(subset);
      expect(recovered).toEqual(secret);
    }
  });

  it('reconstructs the secret when using 4 or all 5 shares', () => {
    const secret = crypto.randomBytes(32);
    const shares = splitSecret(secret, K, N);

    // 4 shares
    const fourShares = [shares[0], shares[1], shares[2], shares[4]];
    expect(combineShares(fourShares)).toEqual(secret);

    // 5 shares
    expect(combineShares(shares)).toEqual(secret);
  });

  it('fails to reconstruct the correct secret with fewer than K shares', () => {
    const secret = crypto.randomBytes(32);
    const shares = splitSecret(secret, K, N);

    // 2 shares: Lagrange interpolation produces wrong bytes
    const twoShares = [shares[0], shares[1]];
    const wrong = combineShares(twoShares);
    expect(wrong).not.toEqual(secret);
  });

  it('handles arbitrary length secrets correctly', () => {
    const lengths = [1, 16, 32, 64, 128, 256];
    for (const len of lengths) {
      const secret = crypto.randomBytes(len);
      const shares = splitSecret(secret, 3, 5);
      const recovered = combineShares([shares[0], shares[2], shares[4]]);
      expect(recovered).toEqual(secret);
    }
  });

  it('throws when no shares are provided', () => {
    expect(() => combineShares([])).toThrow('No shares provided');
  });

  it('throws on invalid K and N parameters', () => {
    const secret = crypto.randomBytes(32);
    expect(() => splitSecret(secret, 6, 5)).toThrow('Threshold K cannot be greater than total shares N');
    expect(() => splitSecret(secret, 0, 5)).toThrow('K and N must be positive integers');
  });
});
