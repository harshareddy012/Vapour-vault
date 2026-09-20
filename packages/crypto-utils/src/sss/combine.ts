import { SecretShare } from '@dfs-sss/shared-types';
import { gfMult, gfDiv } from './gf256.js';

/**
 * Reconstructs the secret key buffer from K or more secret shares using
 * Lagrange Interpolation over GF(2^8) evaluated at x = 0.
 *
 * Formula for each byte position:
 *   f(0) = XOR over i of { y_i * PRODUCT over j≠i of { x_j / (x_j XOR x_i) } }
 *
 * This is the standard Lagrange basis polynomial evaluated at 0, where all
 * arithmetic is in GF(2^8) (XOR for addition, EXP/LOG tables for multiplication).
 *
 * Fewer than K shares produce an incorrect (but indistinguishable) result —
 * the information-theoretic guarantee of Shamir Secret Sharing.
 */
export function combineShares(shares: SecretShare[]): Buffer {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided for reconstruction.');
  }

  const parsedShares = shares.map((s) => ({
    x: s.index,
    bytes: Buffer.from(s.share, 'hex'),
  }));

  const secretLength = parsedShares[0].bytes.length;
  const secret = Buffer.alloc(secretLength);

  for (let byteIdx = 0; byteIdx < secretLength; byteIdx++) {
    let secretByte = 0;

    for (let i = 0; i < parsedShares.length; i++) {
      const xi = parsedShares[i].x;
      const yi = parsedShares[i].bytes[byteIdx];

      // Compute Lagrange basis polynomial L_i(0) in GF(2^8):
      //   L_i(0) = PRODUCT over j≠i of { x_j / (x_i XOR x_j) }
      // because evaluating at 0: (0 - x_j) = x_j in GF(2^8) (negation is identity).
      let li = 1;
      for (let j = 0; j < parsedShares.length; j++) {
        if (i === j) continue;
        const xj = parsedShares[j].x;
        li = gfMult(li, gfDiv(xj, xi ^ xj));
      }

      secretByte ^= gfMult(yi, li);
    }

    secret[byteIdx] = secretByte;
  }

  return secret;
}
