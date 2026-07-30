import crypto from 'crypto';

/**
 * Decrypts AES-256-GCM ciphertext verifying authentication tag.
 */
export function decryptAES(cipherText: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
  if (key.length !== 32) {
    throw new Error('AES-256 requires a 32-byte key.');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted;
}
