import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { TestContext } from 'node:test';
import { Cipher } from './cipher';
import { CipherKey } from './cipher-key-store';
import { FileSystemCipherKeyStore } from './file-system-cipher-key-store';
import { SeedCipherKeyStore } from './seed-cipher-key-store';

async function createTemporaryFolder(t: TestContext): Promise<string> {
  const folderPath = await mkdtemp(join(tmpdir(), 'aila-cipher-'));
  t.after(() => rm(folderPath, { recursive: true, force: true }));
  return folderPath;
}

function createPaths(folderPath: string) {
  return {
    getAppDataFolderPath: () => folderPath
  };
}

test('derives deterministic and purpose-specific keys from a seed', async () => {
  const firstStore = new SeedCipherKeyStore('test-1');
  const secondStore = new SeedCipherKeyStore('test-1');

  assert.deepEqual(firstStore.getKey(CipherKey.PasswordPepper).export(), secondStore.getKey(CipherKey.PasswordPepper).export());
  assert.deepEqual(firstStore.getKey(CipherKey.DataEncryption).export(), secondStore.getKey(CipherKey.DataEncryption).export());
  assert.notDeepEqual(firstStore.getKey(CipherKey.PasswordPepper).export(), firstStore.getKey(CipherKey.DataEncryption).export());

  const encrypted = await new Cipher(firstStore).encryptData('shared value');
  assert.equal(await new Cipher(secondStore).decryptData(encrypted), 'shared value');
  await assert.rejects(new Cipher(new SeedCipherKeyStore('test-2')).decryptData(encrypted), /invalid or has been tampered with/);
  assert.throws(() => new SeedCipherKeyStore(''), /cannot be empty/);
});

test('encrypts authenticated data with a unique initialization vector', async () => {
  const cipher = new Cipher(new SeedCipherKeyStore('test-data'));
  const first = await cipher.encryptData('zażółć 🚀');
  const second = await cipher.encryptData('zażółć 🚀');

  assert.notEqual(first, second);
  assert.equal(await cipher.decryptData(first), 'zażółć 🚀');
  assert.equal(await cipher.decryptData(await cipher.encryptData('')), '');

  const lastCharacter = first.endsWith('A') ? 'B' : 'A';
  const tampered = `${first.slice(0, -1)}${lastCharacter}`;
  await assert.rejects(cipher.decryptData(tampered), /invalid or has been tampered with/);
  await assert.rejects(cipher.decryptData('invalid'), /invalid or has been tampered with/);
});

test('hashes and verifies passwords with unique salts and an installation pepper', async () => {
  const cipher = new Cipher(new SeedCipherKeyStore('test-password'));
  const first = await cipher.hashPassword('correct horse battery staple');
  const second = await cipher.hashPassword('correct horse battery staple');

  assert.notEqual(first, second);
  assert.equal(await cipher.verifyPassword('correct horse battery staple', first), true);
  assert.equal(await cipher.verifyPassword('incorrect', first), false);
  assert.equal(await cipher.verifyPassword('password', 'invalid'), false);

  const otherCipher = new Cipher(new SeedCipherKeyStore('other-installation'));
  assert.equal(await otherCipher.verifyPassword('correct horse battery staple', first), false);
});

test('installs and reloads filesystem keys without allowing replacement', async t => {
  const folderPath = await createTemporaryFolder(t);
  const paths = createPaths(folderPath);
  const firstStore = new FileSystemCipherKeyStore(paths);

  assert.equal(await firstStore.tryLoad(), false);
  assert.throws(() => firstStore.getKey(CipherKey.DataEncryption), /not initialized/);

  await firstStore.install();
  const originalKeyFile = await readFile(join(folderPath, 'cipher-keys.json'), 'utf8');
  await assert.rejects(firstStore.install(), /already initialized/);
  assert.equal(await readFile(join(folderPath, 'cipher-keys.json'), 'utf8'), originalKeyFile);

  const otherStore = new FileSystemCipherKeyStore(paths);
  await assert.rejects(otherStore.install(), /already exists/);
  assert.equal(await readFile(join(folderPath, 'cipher-keys.json'), 'utf8'), originalKeyFile);

  if (process.platform !== 'win32') {
    assert.equal((await stat(join(folderPath, 'cipher-keys.json'))).mode & 0o777, 0o600);
  }

  const encrypted = await new Cipher(firstStore).encryptData('persisted value');
  const secondStore = new FileSystemCipherKeyStore(paths);
  assert.equal(await secondStore.tryLoad(), true);
  assert.equal(await new Cipher(secondStore).decryptData(encrypted), 'persisted value');
});

test('rejects malformed filesystem keys', async t => {
  const folderPath = await createTemporaryFolder(t);
  await writeFile(join(folderPath, 'cipher-keys.json'), '{}', { mode: 0o600 });

  const store = new FileSystemCipherKeyStore(createPaths(folderPath));
  await assert.rejects(store.tryLoad(), /key file is invalid/);
});
