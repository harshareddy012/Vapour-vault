import { generateKey, generateIV, encryptAES, splitSecret, decryptAES, combineShares } from '@dfs-sss/crypto-utils';
import { EncryptionResult, EncryptionLayerResult, SecretShare } from '@dfs-sss/shared-types';
import { createServiceLogger } from '@dfs-sss/logger';

export class EncryptionService {
  private readonly log = createServiceLogger('EncryptionService');

  /**
   * Pure AES-256-GCM encryption step.
   * Generates a fresh random 256-bit key and 96-bit IV per call.
   *
   * The returned keyHex is temporary in-memory key material.
   * Callers must NOT persist, log, or transmit it via HTTP.
   */
  encrypt(fileBuffer: Buffer): EncryptionLayerResult {
    this.log.info({ payloadSizeBytes: fileBuffer.length }, 'AES-256-GCM encryption started');

    const key = generateKey(); // crypto.randomBytes(32) — 256-bit AES key
    const iv  = generateIV();  // crypto.randomBytes(12)  — 96-bit GCM IV

    const { cipherText, authTag } = encryptAES(fileBuffer, key, iv);

    this.log.info(
      {
        ivLengthBytes:       iv.length,
        authTagLengthBytes:  authTag.length,
        ciphertextSizeBytes: cipherText.length,
      },
      'AES-256-GCM encryption succeeded',
    );

    // keyHex is returned as temporary in-memory material so the upcoming SSS
    // ticket can split it. It is never logged, never persisted, never sent
    // through the HTTP layer.
    return {
      encryptedPayload: cipherText,
      iv:      iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyHex:  key.toString('hex'),
    };
  }

  /**
   * Pipeline Step 1: Encrypt file payload using AES-256-GCM.
   * Pipeline Step 2: Split ONLY the random AES key using Shamir's Secret Sharing (K-of-N).
   */
  processUploadEncryption(fileBuffer: Buffer, k: number, n: number): EncryptionResult {
    const aesKey = generateKey();
    const iv = generateIV();

    // Encrypt payload
    const { cipherText, authTag } = encryptAES(fileBuffer, aesKey, iv);

    // Split ONLY the AES key
    const keyShares = splitSecret(aesKey, k, n);

    return {
      encryptedPayload: cipherText,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyShares,
      originalKeyHex: aesKey.toString('hex'),
    };
  }

  /**
   * Pipeline Step 3: Reconstruct AES key from K shares and decrypt payload.
   */
  reconstructAndDecryptPayload(
    cipherText: Buffer,
    shares: SecretShare[],
    ivHex: string,
    authTagHex: string
  ): Buffer {
    const recoveredKey = combineShares(shares);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    return decryptAES(cipherText, recoveredKey, iv, authTag);
  }
}

export const encryptionService = new EncryptionService();
