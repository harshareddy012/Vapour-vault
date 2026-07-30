import crypto from 'crypto';

export interface EncryptedPayload {
  cipherText: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

/**
 * Encrypts data using AES-256-GCM.
 */
export function encryptAES(data: Buffer, key: Buffer, iv: Buffer): EncryptedPayload {
  if (key.length !== 32) {
    throw new Error('AES-256 requires a 32-byte key.');
  }
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cipherText = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { cipherText, iv, authTag };
}
