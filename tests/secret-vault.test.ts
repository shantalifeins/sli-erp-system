import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from '../src/shared/lib/secretVault.js';

describe('Secret Vault', () => {
  const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    process.env.LICENSE_VAULT_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.LICENSE_VAULT_KEY;
  });

  it('should encrypt and decrypt correctly (round-trip)', () => {
    const plaintext = 'super-secret-license-key-123!@#';
    
    const { ciphertext, iv, tag } = encrypt(plaintext);
    
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toBe(plaintext);
    expect(iv).toBeDefined();
    expect(iv.length).toBe(24); // 12 bytes = 24 hex chars
    expect(tag).toBeDefined();

    const decrypted = decrypt(ciphertext, iv, tag);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail to decrypt with wrong key', () => {
    const plaintext = 'test-data';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    
    // Change key
    process.env.LICENSE_VAULT_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    
    expect(() => decrypt(ciphertext, iv, tag)).toThrow();
  });

  it('should detect tampering (wrong tag)', () => {
    const plaintext = 'test-data';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    
    // Modify tag slightly
    const tamperedTag = tag.substring(0, tag.length - 1) + (tag.endsWith('0') ? '1' : '0');
    
    expect(() => decrypt(ciphertext, iv, tamperedTag)).toThrow();
  });

  it('should detect tampering (wrong ciphertext)', () => {
    const plaintext = 'test-data';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    
    // Modify ciphertext slightly
    const tamperedCiphertext = ciphertext.substring(0, ciphertext.length - 1) + (ciphertext.endsWith('0') ? '1' : '0');
    
    expect(() => decrypt(tamperedCiphertext, iv, tag)).toThrow();
  });

  it('should throw error if key is missing', () => {
    delete process.env.LICENSE_VAULT_KEY;
    
    expect(() => encrypt('test')).toThrow('LICENSE_VAULT_KEY environment variable is not set');
    expect(() => decrypt('cipher', 'iv', 'tag')).toThrow('LICENSE_VAULT_KEY environment variable is not set');
  });

  it('should throw error if key is not 32 bytes', () => {
    process.env.LICENSE_VAULT_KEY = 'invalid-length-key';
    
    expect(() => encrypt('test')).toThrow('LICENSE_VAULT_KEY must be a 32-byte hex string (64 characters)');
    expect(() => decrypt('cipher', 'iv', 'tag')).toThrow('LICENSE_VAULT_KEY must be a 32-byte hex string (64 characters)');
  });
});
