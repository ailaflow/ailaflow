import { KeyObject } from 'node:crypto';

export enum CipherKey {
  PasswordPepper = 0,
  DataEncryption = 1
}

export interface CipherKeyStore {
  getKey(key: CipherKey): KeyObject;
}
