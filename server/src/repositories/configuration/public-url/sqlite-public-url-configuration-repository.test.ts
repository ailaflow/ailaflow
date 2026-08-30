import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { PublicUrlConfiguration } from './public-url-configuration';
import { SqlitePublicUrlConfigurationRepository } from './sqlite-public-url-configuration-repository';

test('persists, updates, and clears the Public URL configuration', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqlitePublicUrlConfigurationRepository({ modelDb: db } as SqliteDatabases);
  const abortSignal = new AbortController().signal;
  await repository.setup(abortSignal);

  assert.equal((await repository.get(abortSignal)).publicUrl, null);

  await repository.save(abortSignal, PublicUrlConfiguration.create(' https://aila.example.com/proxy/aila/ '));
  assert.equal((await repository.get(abortSignal)).publicUrl, 'https://aila.example.com/proxy/aila');

  await repository.save(abortSignal, PublicUrlConfiguration.create('http://192.168.1.20:2048'));
  assert.equal((await repository.get(abortSignal)).publicUrl, 'http://192.168.1.20:2048');

  await repository.save(abortSignal, PublicUrlConfiguration.create(null));
  assert.equal((await repository.get(abortSignal)).publicUrl, null);
  db.close();
});

test('validates Public URL configuration before persistence', () => {
  assert.throws(() => PublicUrlConfiguration.create('aila.example.com'), /invalid/);
  assert.throws(() => PublicUrlConfiguration.create('https://aila.example.com?invalid=true'), /query/);
});
