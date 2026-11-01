import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from './sqlite-kv-configuration-repository';

const signal = new AbortController().signal;

async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const repository = new SqliteKvConfigurationRepository(dbs);
  await repository.setup(signal);
  return { db, dbs, repository };
}

test('persists and clears changed fields', async t => {
  const { repository, db, dbs } = await fixture(t);
  const configuration = await repository.get(signal);
  assert.equal(configuration.publicUrl, null);
  configuration.setPublicUrl('https://ailaflow.example.com');
  await repository.updateChanged(signal, configuration);
  const restored = await new SqliteKvConfigurationRepository(dbs).get(signal);
  assert.equal(restored.publicUrl, 'https://ailaflow.example.com');
  assert.deepEqual(restored.getChangedKeys(), []);
  restored.setPublicUrl(null);
  await repository.updateChanged(signal, restored);
  const cleared = await repository.get(signal);
  assert.equal(cleared.publicUrl, null);
  assert.deepEqual(db.prepare('SELECT key FROM kv_configuration').all(), []);
});

test('does not touch unchanged fields and preserves values on failure', async t => {
  const { repository, db } = await fixture(t);
  const initial = await repository.get(signal);
  initial.setPublicUrl('https://ailaflow.example.com');
  await repository.updateChanged(signal, initial);
  db.exec(`CREATE TRIGGER reject_public_url BEFORE UPDATE ON kv_configuration WHEN NEW.key = 'publicUrl'
    BEGIN SELECT RAISE(ABORT, 'URL write rejected'); END`);
  const update = await repository.get(signal);
  await repository.updateChanged(signal, update);
  update.setPublicUrl('https://replacement.example.com');
  await assert.rejects(repository.updateChanged(signal, update), /URL write rejected/);
  const after = await repository.get(signal);
  assert.equal(after.publicUrl, 'https://ailaflow.example.com');
  await assert.rejects(repository.updateChanged(AbortSignal.abort(), update));
});

test('removes obsolete licensing configuration during migration', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const sqliteDatabase = new SqliteDatabase(db);
  db.exec(`
    CREATE TABLE kv_configuration (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT;
    INSERT INTO kv_configuration (key, value) VALUES
      ('publicUrl', '"https://ailaflow.example.com"'),
      ('instanceId', '"instance-id"'),
      ('licenseType', '2'),
      ('licenseKey', '"secret"');
    INSERT INTO _version (tableName, version) VALUES ('kv_configuration', 1);
  `);
  const repository = new SqliteKvConfigurationRepository({ modelDb: sqliteDatabase } as SqliteDatabases);

  await repository.setup(signal);

  assert.deepEqual(
    db
      .prepare('SELECT key FROM kv_configuration ORDER BY key')
      .all()
      .map(row => row.key),
    ['publicUrl']
  );
  assert.equal((await repository.get(signal)).publicUrl, 'https://ailaflow.example.com');
});
