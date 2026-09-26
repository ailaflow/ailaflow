import { createCipheriv, createDecipheriv, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { CipherKey, CipherKeyStore } from './cipher-key-store';

const SECRET_ALGORITHM = 'aes-256-gcm';
const SECRET_FORMAT_VERSION = 'v1';
const SECRET_INITIALIZATION_VECTOR_LENGTH = 12;
const SECRET_AUTHENTICATION_TAG_LENGTH = 16;
const INTERNAL_SECRET_ADDITIONAL_DATA = Buffer.from('ailaflow/data-encryption/v1', 'utf8'); // TODO: delete this

const PASSWORD_FORMAT = 'scrypt-v1';
const PASSWORD_SALT_LENGTH = 16;
const PASSWORD_HASH_LENGTH = 32;

// This profile uses approximately 32 MiB per hash and keeps authentication practical on low-memory hosts such as Raspberry Pi 3.
const PASSWORD_SCRYPT_COST = 2 ** 15;
const PASSWORD_SCRYPT_BLOCK_SIZE = 8;
const PASSWORD_SCRYPT_PARALLELIZATION = 1;
const PASSWORD_SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

export class Cipher {
  public constructor(private readonly keyStore: CipherKeyStore) {}

  public async hashPassword(password: string): Promise<string> {
    const passwordPepper = this.keyStore.getKey(CipherKey.PasswordPepper);
    const salt = randomBytes(PASSWORD_SALT_LENGTH);
    const derivedHash = await derivePasswordHash(password, salt);
    const pepperedHash = createHmac('sha256', passwordPepper).update(derivedHash).digest();

    return [PASSWORD_FORMAT, salt.toString('base64url'), pepperedHash.toString('base64url')].join('$');
  }

  public async verifyPassword(password: string, encodedHash: string): Promise<boolean> {
    const passwordPepper = this.keyStore.getKey(CipherKey.PasswordPepper);
    const parts = encodedHash.split('$');
    if (parts.length !== 3 || parts[0] !== PASSWORD_FORMAT) {
      return false;
    }

    let salt: Buffer;
    let expectedHash: Buffer;
    try {
      salt = decodeBase64Url(parts[1], PASSWORD_SALT_LENGTH);
      expectedHash = decodeBase64Url(parts[2], PASSWORD_HASH_LENGTH);
    } catch {
      return false;
    }

    const derivedHash = await derivePasswordHash(password, salt);
    const actualHash = createHmac('sha256', passwordPepper).update(derivedHash).digest();
    return timingSafeEqual(actualHash, expectedHash);
  }

  public async encryptSecret(secret: string, key: CipherKey.InternalSecretEncryption | CipherKey.ProcessSecretEncryption): Promise<string> {
    const encryptionKey = this.keyStore.getKey(key);
    const initializationVector = randomBytes(SECRET_INITIALIZATION_VECTOR_LENGTH);
    const cipher = createCipheriv(SECRET_ALGORITHM, encryptionKey, initializationVector);
    if (key === CipherKey.InternalSecretEncryption) {
      cipher.setAAD(INTERNAL_SECRET_ADDITIONAL_DATA);
    }

    const encryptedData = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authenticationTag = cipher.getAuthTag();

    return [
      SECRET_FORMAT_VERSION,
      initializationVector.toString('base64url'),
      authenticationTag.toString('base64url'),
      encryptedData.toString('base64url')
    ].join('.');
  }

  public encryptSecretIfPresent(
    secret: string | null,
    key: CipherKey.InternalSecretEncryption | CipherKey.ProcessSecretEncryption
  ): Promise<string | null> {
    return secret === null ? Promise.resolve(null) : this.encryptSecret(secret, key);
  }

  public async decryptSecret(
    encryptedSecret: string,
    key: CipherKey.InternalSecretEncryption | CipherKey.ProcessSecretEncryption
  ): Promise<string> {
    const encryptionKey = this.keyStore.getKey(key);

    try {
      const parts = encryptedSecret.split('.');
      if (parts.length !== 4 || parts[0] !== SECRET_FORMAT_VERSION) {
        throw new Error('Unsupported encrypted data format');
      }

      const initializationVector = decodeBase64Url(parts[1], SECRET_INITIALIZATION_VECTOR_LENGTH);
      const authenticationTag = decodeBase64Url(parts[2], SECRET_AUTHENTICATION_TAG_LENGTH);
      const ciphertext = Buffer.from(parts[3], 'base64url');

      const decipher = createDecipheriv(SECRET_ALGORITHM, encryptionKey, initializationVector);
      if (key === CipherKey.InternalSecretEncryption) {
        decipher.setAAD(INTERNAL_SECRET_ADDITIONAL_DATA);
      }
      decipher.setAuthTag(authenticationTag);

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (error) {
      throw new Error('Encrypted data is invalid or has been tampered with', { cause: error });
    }
  }

  public decryptSecretIfPresent(
    encryptedSecret: string | null,
    key: CipherKey.InternalSecretEncryption | CipherKey.ProcessSecretEncryption
  ): Promise<string | null> {
    return encryptedSecret === null ? Promise.resolve(null) : this.decryptSecret(encryptedSecret, key);
  }
}

function derivePasswordHash(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolvePromise, rejectPromise) => {
    scrypt(
      password,
      salt,
      PASSWORD_HASH_LENGTH,
      {
        N: PASSWORD_SCRYPT_COST,
        r: PASSWORD_SCRYPT_BLOCK_SIZE,
        p: PASSWORD_SCRYPT_PARALLELIZATION,
        maxmem: PASSWORD_SCRYPT_MAX_MEMORY
      },
      (error, derivedKey) => {
        if (error) {
          rejectPromise(error);
          return;
        }

        resolvePromise(derivedKey);
      }
    );
  });
}

function decodeBase64Url(value: string, expectedLength: number): Buffer {
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== expectedLength) {
    throw new Error('Invalid base64url value');
  }

  return decoded;
}
