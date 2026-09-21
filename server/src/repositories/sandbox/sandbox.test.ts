import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Cipher } from '../../core/cipher/cipher';
import { SeedCipherKeyStore } from '../../core/cipher/seed-cipher-key-store';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Sandbox } from './sandbox';
import { SqliteSandboxRepository } from './sqlite-sandbox-repository';

const signal = new AbortController().signal;

test('repository stores sandbox secrets encrypted and returns plaintext values', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const cipher = new Cipher(new SeedCipherKeyStore('sandbox-test'));
  const repository = new SqliteSandboxRepository(dbs, cipher);
  await repository.setup(signal);
  const secrets = {
    API_KEY: 'secret-value',
    EMPTY_VALUE: ''
  };

  const sandbox = Sandbox.create({
    insert: true,
    name: 'default',
    description: 'Default sandbox',
    configuration: '',
    isEnabled: true,
    secrets
  });
  await repository.insert(signal, sandbox);

  const encryptedSecrets = (db.prepare('SELECT secrets FROM sandboxes').get() as { secrets: string }).secrets;
  assert.match(encryptedSecrets, /^v1\./);
  assert.equal(encryptedSecrets.includes('API_KEY'), false);
  assert.equal(encryptedSecrets.includes('secret-value'), false);

  const restored = await repository.tryGet(signal, sandbox.name);
  assert.deepEqual(restored?.secrets, secrets);
  assert.equal(restored?.hash, sandbox.hash);
  assert.equal(restored?.token, sandbox.token);
});

test('repository update preserves the token', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const cipher = new Cipher(new SeedCipherKeyStore('sandbox-test'));
  const repository = new SqliteSandboxRepository(dbs, cipher);
  await repository.setup(signal);

  const sandbox = Sandbox.create({
    insert: true,
    name: 'default',
    description: 'Default sandbox',
    configuration: '',
    isEnabled: true,
    secrets: {}
  });
  await repository.insert(signal, sandbox);

  sandbox.update({
    insert: false,
    name: sandbox.name,
    description: 'Updated sandbox',
    configuration: 'RUN echo updated',
    isEnabled: false,
    secrets: { API_KEY: 'updated' }
  });
  await repository.update(signal, sandbox);

  const restored = await repository.tryGet(signal, sandbox.name);
  assert.equal(restored?.token, sandbox.token);
  assert.equal(restored?.description, 'Updated sandbox');
  assert.equal(restored?.configuration, 'RUN echo updated');
  assert.equal(restored?.isEnabled, false);
  assert.deepEqual(restored?.secrets, { API_KEY: 'updated' });
});
