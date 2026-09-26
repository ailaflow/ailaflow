import assert from 'node:assert/strict';
import test from 'node:test';
import { Cipher } from '../../core/cipher/cipher';
import { CipherKey } from '../../core/cipher/cipher-key-store';
import { SeedCipherKeyStore } from '../../core/cipher/seed-cipher-key-store';
import { DecryptSecretRpcHandler } from './decrypt-secret-rpc-handler';
import { EncryptSecretRpcHandler } from './encrypt-secret-rpc-handler';

test('encrypts and decrypts process secrets through RPC handlers', async () => {
  const signal = new AbortController().signal;
  const cipher = new Cipher(new SeedCipherKeyStore('secret-rpc-handlers'));
  const encryptHandler = new EncryptSecretRpcHandler(cipher);
  const decryptHandler = new DecryptSecretRpcHandler(cipher);

  const encryptedSecret = await encryptHandler.handle(signal, 'sandbox', 'execution', { secret: 'mail-password' });

  assert.match(encryptedSecret, /^v1\./);
  assert.equal(await decryptHandler.handle(signal, 'sandbox', 'execution', { encryptedSecret }), 'mail-password');
  await assert.rejects(cipher.decryptSecret(encryptedSecret, CipherKey.InternalSecretEncryption), /invalid or has been tampered with/);
  await assert.rejects(() => encryptHandler.handle(signal, 'sandbox', 'execution', { secret: 1 }));
  await assert.rejects(() => decryptHandler.handle(signal, 'sandbox', 'execution', { encryptedSecret: null }));
});
