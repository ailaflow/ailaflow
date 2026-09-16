import { createSecretKey, KeyObject, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AsyncMutex } from '../async-mutex';
import { CipherKey, CipherKeyStore } from './cipher-key-store';
import { ServerPaths } from '../server-paths';

const KEY_FILE_NAME = 'cipher-keys.json';
const KEY_FILE_VERSION = 1;
const KEY_LENGTH = 32;

interface StoredCipherKeys {
  version: 1;
  passwordPepper: string;
  dataEncryptionKey: string;
}

type CipherKeys = Readonly<Record<CipherKey, KeyObject>>;

export class FileSystemCipherKeyStore implements CipherKeyStore {
  private readonly folderPath: string;
  private readonly mutex = new AsyncMutex();
  private keys: CipherKeys | null = null;

  public constructor(paths: Pick<ServerPaths, 'getAppDataFolderPath'>) {
    this.folderPath = paths.getAppDataFolderPath();
  }

  public async install(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      if (this.keys) {
        throw new Error('Cipher key store is already initialized');
      }

      const secretPath = this.getSecretPath();
      const keys = createRandomKeys();
      await mkdir(this.folderPath, { recursive: true });
      try {
        await writeFile(secretPath, serializeKeys(keys), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      } catch (error) {
        if (hasErrorCode(error, 'EEXIST')) {
          throw new Error(`Cipher key file already exists: ${secretPath}`, { cause: error });
        }
        throw error;
      }
      this.keys = keys;
    } finally {
      release();
    }
  }

  public async tryLoad(): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      if (this.keys) {
        return true;
      }
      this.keys = await this.tryReadKeys(this.getSecretPath());
      return this.keys !== null;
    } finally {
      release();
    }
  }

  public getKey(key: CipherKey): KeyObject {
    if (!this.keys) {
      throw new Error('Cipher key store is not initialized');
    }
    return this.keys[key];
  }

  private getSecretPath(): string {
    return join(this.folderPath, KEY_FILE_NAME);
  }

  private async tryReadKeys(secretPath: string): Promise<CipherKeys | null> {
    let serializedKeys: string;
    try {
      serializedKeys = await readFile(secretPath, 'utf8');
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) {
        return null;
      }
      throw error;
    }

    try {
      return parseKeys(serializedKeys);
    } catch (error) {
      throw new Error(`Cipher key file is invalid: ${secretPath}`, { cause: error });
    }
  }
}

function createRandomKeys(): CipherKeys {
  return {
    [CipherKey.PasswordPepper]: createSecretKey(randomBytes(KEY_LENGTH)),
    [CipherKey.DataEncryption]: createSecretKey(randomBytes(KEY_LENGTH))
  };
}

function serializeKeys(keys: CipherKeys): string {
  const storedKeys: StoredCipherKeys = {
    version: KEY_FILE_VERSION,
    passwordPepper: keys[CipherKey.PasswordPepper].export().toString('base64url'),
    dataEncryptionKey: keys[CipherKey.DataEncryption].export().toString('base64url')
  };
  return `${JSON.stringify(storedKeys, null, 2)}\n`;
}

function parseKeys(serializedKeys: string): CipherKeys {
  const value = JSON.parse(serializedKeys) as StoredCipherKeys;
  if (value.version !== KEY_FILE_VERSION) {
    throw new Error('Unsupported cipher key format');
  }

  return {
    [CipherKey.PasswordPepper]: createSecretKey(decodeKey(value.passwordPepper)),
    [CipherKey.DataEncryption]: createSecretKey(decodeKey(value.dataEncryptionKey))
  };
}

function decodeKey(value: string): Buffer {
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== KEY_LENGTH) {
    throw new Error('Invalid cipher key');
  }

  return decoded;
}

function hasErrorCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
}
