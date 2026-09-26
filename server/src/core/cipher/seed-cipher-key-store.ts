import { createSecretKey, hkdfSync, KeyObject } from 'node:crypto';
import { CipherKey, CipherKeyStore } from './cipher-key-store';

const KEY_LENGTH = 32;
const DERIVATION_SALT = Buffer.from('ailaflow/cipher/from-seed/v1', 'utf8');
const PASSWORD_PEPPER_DERIVATION_INFO = Buffer.from('ailaflow/password-pepper/v1', 'utf8');
const INTERNAL_SECRET_KEY_DERIVATION_INFO = Buffer.from('ailaflow/data-encryption/v1', 'utf8');
const PROCESS_SECRET_KEY_DERIVATION_INFO = Buffer.from('ailaflow/process-secret-encryption/v1', 'utf8');

export class SeedCipherKeyStore implements CipherKeyStore {
  private readonly keys: Readonly<Record<CipherKey, KeyObject>>;

  public constructor(seed: string) {
    if (seed.length === 0) {
      throw new Error('Cipher seed cannot be empty');
    }

    const seedBytes = Buffer.from(seed, 'utf8');
    this.keys = {
      [CipherKey.PasswordPepper]: deriveKey(seedBytes, PASSWORD_PEPPER_DERIVATION_INFO),
      [CipherKey.InternalSecretEncryption]: deriveKey(seedBytes, INTERNAL_SECRET_KEY_DERIVATION_INFO),
      [CipherKey.ProcessSecretEncryption]: deriveKey(seedBytes, PROCESS_SECRET_KEY_DERIVATION_INFO)
    };
  }

  public getKey(key: CipherKey): KeyObject {
    return this.keys[key];
  }
}

function deriveKey(seed: Buffer, info: Buffer): KeyObject {
  const key = hkdfSync('sha256', seed, DERIVATION_SALT, info, KEY_LENGTH);
  return createSecretKey(Buffer.from(key));
}
