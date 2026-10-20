import { describe, expect, it } from 'vitest';
import { encodeErasure } from './encode.js';
import { decodeErasure } from './decode.js';
import crypto from 'crypto';

describe('Systematic 3-of-5 Erasure Coding', () => {
  const K = 3;
  const N = 5;

  it('reconstructs payload from all 10 possible combinations of 3 shards', () => {
    const payload = crypto.randomBytes(1024);
    const shards = encodeErasure(payload, K, N);
    expect(shards).toHaveLength(5);

    // Verify all 10 combinations of 3 choose 5
    const combinations: number[][] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        for (let k = j + 1; k < N; k++) {
          combinations.push([i, j, k]);
        }
      }
    }
    expect(combinations).toHaveLength(10);

    for (const [i1, i2, i3] of combinations) {
      const subset = [shards[i1], shards[i2], shards[i3]];
      const recovered = decodeErasure(subset, payload.length, K);
      expect(recovered).toEqual(payload);
    }
  });

  it('verifies the systematic property: shards 1, 2, 3 contain original partitioned data', () => {
    const payload = Buffer.from('HelloWorld! This is a test for systematic sharding.');
    const shards = encodeErasure(payload, K, N);
    const shardLen = Math.ceil(payload.length / K);

    const chunk1 = shards[0].data;
    const chunk2 = shards[1].data;
    const chunk3 = shards[2].data;

    const reconstructedFromDataOnly = Buffer.concat([chunk1, chunk2, chunk3]).subarray(0, payload.length);
    expect(reconstructedFromDataOnly).toEqual(payload);

    // Direct decode with just shards 1, 2, 3
    const decoded = decodeErasure([shards[0], shards[1], shards[2]], payload.length, K);
    expect(decoded).toEqual(payload);
  });

  it('reconstructs accurately from parity-only or mixed subsets (e.g. shards 3, 4, 5)', () => {
    const payload = crypto.randomBytes(500);
    const shards = encodeErasure(payload, K, N);

    // Shards 4 and 5 are parity shards. Subset: Shard 3, Shard 4, Shard 5
    const subset = [shards[2], shards[3], shards[4]];
    const recovered = decodeErasure(subset, payload.length, K);
    expect(recovered).toEqual(payload);

    // Subset: Shards 2, 4, 5
    const subset2 = [shards[1], shards[3], shards[4]];
    expect(decodeErasure(subset2, payload.length, K)).toEqual(payload);

    // Subset: Shards 1, 4, 5
    const subset3 = [shards[0], shards[3], shards[4]];
    expect(decodeErasure(subset3, payload.length, K)).toEqual(payload);
  });

  it('handles arbitrary sizes including zero, odd, and non-multiples of K', () => {
    const testSizes = [0, 1, 2, 3, 4, 5, 7, 13, 31, 100, 333, 1024, 4096, 65537];
    for (const size of testSizes) {
      const payload = crypto.randomBytes(size);
      const shards = encodeErasure(payload, K, N);
      // Test with combination (2, 4, 5) — requires both parity shards
      const recovered = decodeErasure([shards[1], shards[3], shards[4]], payload.length, K);
      expect(recovered).toEqual(payload);
      expect(recovered.length).toBe(size);
    }
  });

  it('reconstructs when provided with 4 or 5 shards', () => {
    const payload = crypto.randomBytes(256);
    const shards = encodeErasure(payload, K, N);

    // 4 shards
    const fourShards = [shards[0], shards[1], shards[3], shards[4]];
    expect(decodeErasure(fourShards, payload.length, K)).toEqual(payload);

    // All 5 shards
    expect(decodeErasure(shards, payload.length, K)).toEqual(payload);
  });

  it('fails when fewer than K shards are provided', () => {
    const payload = crypto.randomBytes(256);
    const shards = encodeErasure(payload, K, N);

    expect(() => decodeErasure([shards[0], shards[1]], payload.length, K)).toThrow('Insufficient shards');
    expect(() => decodeErasure([shards[3]], payload.length, K)).toThrow('Insufficient shards');
  });

  it('detects duplicate shards and rejects if unique count is below K', () => {
    const payload = crypto.randomBytes(256);
    const shards = encodeErasure(payload, K, N);

    // 3 items but duplicates of shard 1 and 2
    const duplicates = [shards[0], shards[1], shards[0]];
    expect(() => decodeErasure(duplicates, payload.length, K)).toThrow('Insufficient unique shards');
  });

  it('produces corrupted output when a shard is corrupted', () => {
    const payload = crypto.randomBytes(256);
    const shards = encodeErasure(payload, K, N);

    // Corrupt one byte of shard 4
    const corruptedShard4 = {
      index: 4,
      data: Buffer.from(shards[3].data),
    };
    corruptedShard4.data[0] ^= 0xff;

    // Decoding with corrupted parity shard
    const recovered = decodeErasure([shards[0], shards[1], corruptedShard4], payload.length, K);
    // Since shard 1 and 2 are present, target 1 and 2 are copied, but target 3 needs interpolation using shard 4
    expect(recovered).not.toEqual(payload);
  });
});
