/**
 * GF(2^8) Finite Field Arithmetic
 *
 * Precomputed log/exp tables using the irreducible polynomial P(x) = x^8 + x^4 + x^3 + x + 1
 * (represented as 0x11b). This is the same field used in AES.
 *
 * All Shamir Secret Sharing arithmetic operates inside this field.
 * Extracted here to avoid duplication between split.ts and combine.ts.
 */

// EXP[i] = g^i mod P(x), where g = 0x03 (a generator of GF(2^8)*).
// Doubled to 512 entries to avoid modular reduction in multiplication.
export const EXP = new Uint8Array(512);

// LOG[x] = i such that g^i = x mod P(x). LOG[0] is undefined (0 has no log).
export const LOG = new Uint8Array(256);

// Build the tables at module load time — runs exactly once.
(function initGF256Tables(): void {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x; // duplicate to avoid mod 255 in gfMult
    LOG[x] = i;
    // Multiply by generator 0x03 in GF(2^8): x = x * 0x03 mod P(x)
    x = (x << 1) ^ (x & 0x80 ? 0x11b : 0);
  }
})();

/**
 * Multiplies two elements of GF(2^8) using the precomputed tables.
 * gfMult(a, b) = EXP[LOG[a] + LOG[b]]  (with LOG[0] = 0 handled separately)
 */
export function gfMult(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/**
 * Divides two elements of GF(2^8): a / b = a * b^(-1).
 * b^(-1) = EXP[255 - LOG[b]]
 */
export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(2^8).');
  if (a === 0) return 0;
  return EXP[LOG[a] + 255 - LOG[b]];
}
