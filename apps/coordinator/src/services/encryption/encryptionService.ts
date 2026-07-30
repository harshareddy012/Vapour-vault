import { generateKey, generateIV, encryptAES, splitSecret, decryptAES, combineShares } from '@dfs-sss/crypto-utils';
import { EncryptionResult, SecretShare } from '@dfs-sss/shared-types';

export class EncryptionService {
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
