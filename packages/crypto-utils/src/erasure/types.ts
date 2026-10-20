export interface ErasureShard {
  /** 1-based shard index (1..N) */
  index: number;
  /** Raw binary data of this shard */
  data: Buffer;
}
