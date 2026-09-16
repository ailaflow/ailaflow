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
    name: 'default',
    description: 'Default sandbox',
    configuration: '',
    isEnabled: true,
    secrets
  });
  await repository.upsert(signal, sandbox);

  const serializedSecrets = (db.prepare('SELECT serializedSecrets FROM sandboxes').get() as { serializedSecrets: string })
    .serializedSecrets;
  assert.equal(serializedSecrets.includes('secret-value'), false);

  const restored = await repository.tryGet(signal, sandbox.name);
  assert.deepEqual(restored?.secrets, secrets);
  assert.equal(restored?.hash, sandbox.hash);
});
