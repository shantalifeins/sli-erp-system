import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const keyHex = process.env.LICENSE_VAULT_KEY;
  if (!keyHex) {
    throw new Error('LICENSE_VAULT_KEY environment variable is not set');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('LICENSE_VAULT_KEY must be a 32-byte hex string (64 characters)');
  }

  const iv = crypto.randomBytes(12); // GCM standard IV length
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag
  };
}

export function decrypt(ciphertext: string, ivHex: string, tagHex: string): string {
  const keyHex = process.env.LICENSE_VAULT_KEY;
  if (!keyHex) {
    throw new Error('LICENSE_VAULT_KEY environment variable is not set');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('LICENSE_VAULT_KEY must be a 32-byte hex string (64 characters)');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
