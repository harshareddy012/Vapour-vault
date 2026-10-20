import { ErasureShard } from './types.js';
import { gfDiv, gfMult } from '../sss/gf256.js';

/**
 * Computes Lagrange interpolation basis weight L_i(x) in GF(2^8):
 *   L_i(x) = PRODUCT_{m=1..K, m!=i} (x XOR m) / (i XOR m)
 */
function lagrangeWeight(x: number, i: number, k: number): number {
  let weight = 1;
  for (let m = 1; m <= k; m++) {
    if (m === i) continue;
    weight = gfMult(weight, gfDiv(x ^ m, i ^ m));
  }
  return weight;
}

/**
 * Encodes a buffer into N erasure-coded shards with recovery threshold K.
 * Uses a systematic Reed-Solomon scheme over GF(2^8):
 * - Shards 1..K contain the original data partitioned into K equal-size chunks.
 * - Shards (K+1)..N contain parity chunks evaluated at x = (K+1)..N.
 *
 * @param payload The raw buffer to encode (e.g. AES-256-GCM ciphertext).
 * @param k Number of data shards required for reconstruction (default 3).
 * @param n Total number of shards generated (default 5).
 * @returns Array of N ErasureShard objects.
 */
export function encodeErasure(
  payload: Buffer,
  k: number = 3,
  n: number = 5,
): ErasureShard[] {
  if (k < 1 || n < 1) throw new Error('K and N must be positive integers.');
  if (k > n) throw new Error('Threshold K cannot be greater than total shards N.');
  if (n > 255) throw new Error('Total shards N cannot exceed 255 in GF(2^8).');

  const shardLength = Math.ceil(payload.length / k);

  // Allocate K data buffers (shards 1..K)
  const shards: Buffer[] = [];
  for (let i = 0; i < k; i++) {
    const chunk = Buffer.alloc(shardLength);
    const start = i * shardLength;
    const end = Math.min(start + shardLength, payload.length);
    if (start < payload.length) {
      payload.copy(chunk, 0, start, end);
    }
    shards.push(chunk);
  }

  // Precompute Lagrange evaluation weights for each parity shard x in (K+1)..N
  // parityWeights[xIndex][i] = L_(i+1)(x)
  const parityWeights: number[][] = [];
  for (let x = k + 1; x <= n; x++) {
    const weights: number[] = [];
    for (let i = 1; i <= k; i++) {
      weights.push(lagrangeWeight(x, i, k));
    }
    parityWeights.push(weights);
  }

  // Compute parity shards (K+1)..N
  for (let pIdx = 0; pIdx < n - k; pIdx++) {
    const parityBuffer = Buffer.alloc(shardLength);
    const weights = parityWeights[pIdx];

    for (let byteIdx = 0; byteIdx < shardLength; byteIdx++) {
      let val = 0;
      for (let i = 0; i < k; i++) {
        val ^= gfMult(shards[i][byteIdx], weights[i]);
      }
      parityBuffer[byteIdx] = val;
    }
    shards.push(parityBuffer);
  }

  return shards.map((data, idx) => ({
    index: idx + 1,
    data,
  }));
}
