import { SecretShare } from '@dfs-sss/shared-types';

// Precomputed GF(2^8) tables
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

function gfMult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(2^8).');
  if (a === 0) return 0;
  return EXP[LOG[a] + 255 - LOG[b]];
}

/**
 * Reconstructs secret key buffer using Lagrange Interpolation over GF(2^8) at x=0.
 * f(0) = \sum_{i=0}^{K-1} y_i \prod_{j \ne i} \frac{x_j}{x_j \oplus x_i}
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

      // Compute Lagrange basis polynomial L_i(0)
      let li = 1;
      for (let j = 0; j < parsedShares.length; j++) {
        if (i === j) continue;
        const xj = parsedShares[j].x;
        // L_i(0) = \prod (0 - x_j) / (x_i - x_j) = \prod x_j / (x_i \oplus x_j)
        const numerator = xj;
        const denominator = xi ^ xj;
        li = gfMult(li, gfDiv(numerator, denominator));
      }

      secretByte ^= gfMult(yi, li);
    }

    secret[byteIdx] = secretByte;
  }

  return secret;
}
