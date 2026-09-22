import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../../core/sqlite-databases';
import { LlmProviderConfiguration } from './llm-provider-configuration';
import { LlmProviderType, LlmUseCase } from '@ailaflow/shared';
import { LlmUseCaseConfiguration } from './llm-use-case-configuration';
import { SqliteLlmConfigurationRepository } from './sqlite-llm-configuration-repository';
import { Cipher } from '../../../core/cipher/cipher';
import { SeedCipherKeyStore } from '../../../core/cipher/seed-cipher-key-store';

test('domain validates provider and use-case invariants', () => {
  assert.throws(
    () =>
      LlmProviderConfiguration.create({
        name: 'Gateway',
        type: LlmProviderType.OPENAI_COMPATIBLE,
        url: null,
        apiKey: 'secret',
        models: []
      }),
    /URL is required/
  );
  assert.throws(
    () => LlmUseCaseConfiguration.create(LlmUseCase.ADMIN_CHAT, 'provider', null, undefined, 95),
    /both be set or both be null/
  );
  const modelName = 'model with spaces ';
  const provider = LlmProviderConfiguration.create({
    name: 'Provider',
    type: LlmProviderType.OPENAI,
    url: null,
    apiKey: 'secret',
    models: [{ name: modelName }]
  });
  const useCase = LlmUseCaseConfiguration.create(LlmUseCase.ADMIN_CHAT, provider.id, modelName, undefined, 95);
  assert.equal(provider.models[0].name, modelName);
  assert.equal(useCase.modelName, modelName);

  const codex = LlmProviderConfiguration.create({
    name: 'Local Codex',
    type: LlmProviderType.CODEX_APP_SERVER,
    url: 'ws://127.0.0.1:4500',
    apiKey: null,
    models: []
  });
  assert.equal(codex.url, 'ws://127.0.0.1:4500');
  assert.equal(codex.apiKey, null);
  assert.throws(
    () =>
      LlmProviderConfiguration.create({
        name: 'Noncanonical Codex',
        type: LlmProviderType.CODEX_APP_SERVER,
        url: 'ws://127.0.0.1:4500/',
        apiKey: null,
        models: []
      }),
    /canonical/
  );
  assert.throws(
    () =>
      LlmProviderConfiguration.create({
        name: 'Invalid Codex',
        type: LlmProviderType.CODEX_APP_SERVER,
        url: 'http://127.0.0.1:4500',
        apiKey: null,
        models: []
      }),
    /protocol/
  );
});

test('persists LLM providers and use-case configurations', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const repository = createRepository(db);
  const signal = new AbortController().signal;
  await repository.setup(signal);

  const provider = LlmProviderConfiguration.create({
    name: 'Primary OpenAI',
    type: LlmProviderType.OPENAI,
    url: null,
    apiKey: 'secret',
    models: [{ name: 'gpt-model', contextWindow: 131_072 }]
  });
  await repository.insertProvider(signal, provider);
  const providerRow = db.prepare(`SELECT apiKey FROM llm_providers WHERE id = ?`).get(provider.id) as { apiKey: string };
  assert.notEqual(providerRow.apiKey, provider.apiKey);
  assert.match(providerRow.apiKey, /^v1\./);
  const codexProvider = LlmProviderConfiguration.create({
    name: 'Local Codex',
    type: LlmProviderType.CODEX_APP_SERVER,
    url: 'ws://127.0.0.1:4500',
    apiKey: null,
    models: [{ name: 'codex-model' }]
  });
  await repository.insertProvider(signal, codexProvider);
  const codexRow = db.prepare(`SELECT url, apiKey FROM llm_providers WHERE id = ?`).get(codexProvider.id) as {
    url: string;
    apiKey: string | null;
  };
  assert.notEqual(codexRow.url, codexProvider.url);
  assert.match(codexRow.url, /^v1\./);
  assert.equal(codexRow.apiKey, null);
  const restoredCodexProvider = await repository.tryGetProvider(signal, codexProvider.id);
  assert.equal(restoredCodexProvider?.url, codexProvider.url);
  assert.equal(restoredCodexProvider?.apiKey, null);
  await repository.saveUseCases(signal, [new LlmUseCaseConfiguration(LlmUseCase.ADMIN_CHAT, provider.id, 'gpt-model', 120_000, 90)], []);

  const configuration = await repository.get(signal);
  assert.equal(configuration.getProvider(provider.id).apiKey, 'secret');
  assert.deepEqual(configuration.getProvider(provider.id).models, [{ name: 'gpt-model', contextWindow: 131_072 }]);
  assert.equal(configuration.getUseCase(LlmUseCase.ADMIN_CHAT).modelName, 'gpt-model');
  assert.equal(configuration.getUseCase(LlmUseCase.ADMIN_CHAT).modelContextWindow, 120_000);
  assert.equal(configuration.getUseCase(LlmUseCase.ADMIN_CHAT).effectiveContextWindowPercent, 90);

  await assert.rejects(() => repository.deleteProvider(signal, provider.id), /assigned to a use case/);
  await repository.saveUseCases(signal, [], [LlmUseCase.ADMIN_CHAT]);
  assert.equal(await repository.deleteProvider(signal, provider.id), true);
  assert.equal(await repository.deleteProvider(signal, codexProvider.id), true);
  assert.equal((await repository.get(signal)).providers.length, 0);
  db.close();
});

test('updates provider data while retaining its stable ID', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const repository = createRepository(db);
  const signal = new AbortController().signal;
  await repository.setup(signal);

  const provider = LlmProviderConfiguration.create({
    name: 'Gateway',
    type: LlmProviderType.OPENAI_COMPATIBLE,
    url: 'https://gateway.example/v1',
    apiKey: 'old-secret',
    models: [{ name: 'old-model' }]
  });
  await repository.insertProvider(signal, provider);
  assert.throws(
    () =>
      provider.update({
        name: 'Gateway 2',
        type: LlmProviderType.ANTHROPIC,
        url: null,
        apiKey: null,
        models: [{ name: 'new-model' }]
      }),
    /API key must be entered/
  );
  provider.update({
    name: 'Gateway 2',
    type: LlmProviderType.ANTHROPIC,
    url: null,
    apiKey: 'new-secret',
    models: [{ name: 'new-model' }]
  });
  await repository.updateProvider(signal, provider);

  const restored = await repository.tryGetProvider(signal, provider.id);
  assert.equal(restored?.name, 'Gateway 2');
  assert.equal(restored?.type, LlmProviderType.ANTHROPIC);
  assert.equal(restored?.apiKey, 'new-secret');
  assert.deepEqual(restored?.models, [{ name: 'new-model' }]);
  db.close();
});

function createRepository(db: DatabaseSync): SqliteLlmConfigurationRepository {
  const cipher = new Cipher(new SeedCipherKeyStore('llm-configuration-test'));
  return new SqliteLlmConfigurationRepository({ modelDb: new SqliteDatabase(db) } as SqliteDatabases, cipher);
}
