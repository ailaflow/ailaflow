import { KeyObject } from 'node:crypto';

export enum CipherKey {
  PasswordPepper = 0,
  InternalSecretEncryption = 1,
  ProcessSecretEncryption = 2
}

export interface CipherKeyStore {
  getKey(key: CipherKey): KeyObject;
}
