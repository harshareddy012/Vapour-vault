import { ErasureShard } from './types.js';
import { gfDiv, gfMult } from '../sss/gf256.js';

/**
 * Reconstructs original data from any K or more valid shards using Lagrange interpolation over GF(2^8).
 *
 * @param shards Array of available ErasureShard objects (must have at least K unique shards).
 * @param originalLength The exact length of the original payload prior to padding.
 * @param k Number of data shards required for reconstruction (default 3).
 * @returns The reconstructed original Buffer, trimmed to originalLength.
 */
export function decodeErasure(
  shards: ErasureShard[],
  originalLength: number,
  k: number = 3,
): Buffer {
  if (!shards || shards.length < k) {
    throw new Error(
      `Insufficient shards for reconstruction: need at least ${k}, received ${shards?.length ?? 0}.`,
    );
  }

  // Deduplicate shards by index, taking first K distinct shards
  const uniqueShardsMap = new Map<number, Buffer>();
  for (const s of shards) {
    if (!uniqueShardsMap.has(s.index)) {
      uniqueShardsMap.set(s.index, s.data);
    }
  }

  if (uniqueShardsMap.size < k) {
    throw new Error(
      `Insufficient unique shards: need at least ${k}, got ${uniqueShardsMap.size}.`,
    );
  }

  const selectedShards: { index: number; data: Buffer }[] = [];
  for (const [index, data] of uniqueShardsMap) {
    selectedShards.push({ index, data });
    if (selectedShards.length === k) break;
  }

  const shardLength = selectedShards[0].data.length;
  for (const s of selectedShards) {
    if (s.data.length !== shardLength) {
      throw new Error(`Shard length mismatch: expected ${shardLength}, got ${s.data.length}`);
    }
  }

  const xs = selectedShards.map((s) => s.index);

  // We need to recover data blocks D_0..D_(K-1), which correspond to evaluations at t in 1..K
  const recoveredDataBlocks: Buffer[] = [];

  for (let t = 1; t <= k; t++) {
    // If target block t is already among our selected shards, copy it directly
    const existingIndex = xs.indexOf(t);
    if (existingIndex !== -1) {
      recoveredDataBlocks.push(selectedShards[existingIndex].data);
      continue;
    }

    // Otherwise, compute Lagrange interpolation weights for evaluating P(t) from xs
    // lambda[j] = PRODUCT_{m=0..K-1, m!=j} (t XOR xs[m]) / (xs[j] XOR xs[m])
    const weights = new Array<number>(k);
    for (let j = 0; j < k; j++) {
      let weight = 1;
      for (let m = 0; m < k; m++) {
        if (m === j) continue;
        weight = gfMult(weight, gfDiv(t ^ xs[m], xs[j] ^ xs[m]));
      }
      weights[j] = weight;
    }

    // Reconstruct block t
    const block = Buffer.alloc(shardLength);
    for (let byteIdx = 0; byteIdx < shardLength; byteIdx++) {
      let val = 0;
      for (let j = 0; j < k; j++) {
        val ^= gfMult(selectedShards[j].data[byteIdx], weights[j]);
      }
      block[byteIdx] = val;
    }
    recoveredDataBlocks.push(block);
  }

  // Concatenate data blocks and truncate to originalLength
  const fullReconstructed = Buffer.concat(recoveredDataBlocks);
  return fullReconstructed.subarray(0, originalLength);
}
