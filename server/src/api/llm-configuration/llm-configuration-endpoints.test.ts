import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { LlmProviderType, LlmUseCase } from '@ailaflow/model';
import type { LlmClient } from '@aibindkit/llm';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { EventBus } from '../../events/event-bus';
import { Event } from '../../events/event';
import { LlmConfigurationChangedEvent } from '../../events/llm-configuration/llm-configuration-changed-event';
import { LlmClientFactory } from '../../llm/llm-client-factory';
import { LlmProviderConfiguration } from '../../repositories/configuration/llm/llm-provider-configuration';
import { SqliteLlmConfigurationRepository } from '../../repositories/configuration/llm/sqlite-llm-configuration-repository';
import { DeleteLlmProviderEndpoint } from './delete-llm-provider-endpoint';
import { FetchLlmProviderModelsEndpoint } from './fetch-llm-provider-models-endpoint';
import { GetLlmConfigurationEndpoint } from './get-llm-configuration-endpoint';
import { SaveLlmProviderEndpoint } from './save-llm-provider-endpoint';
import { SaveLlmUseCaseAssignmentsEndpoint } from './save-llm-use-case-assignments-endpoint';

test('configures providers and use cases without exposing API keys', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const repository = new SqliteLlmConfigurationRepository({ modelDb: db } as SqliteDatabases);
  const eventBus = new RecordingEventBus();
  const saveProvider = new SaveLlmProviderEndpoint(repository, eventBus);
  const saveUseCases = new SaveLlmUseCaseAssignmentsEndpoint(repository, eventBus);
  const deleteProvider = new DeleteLlmProviderEndpoint(repository, eventBus);
  const getConfiguration = new GetLlmConfigurationEndpoint(repository);
  const modelClientFactory = new FakeModelLlmClientFactory();
  const fetchModels = new FetchLlmProviderModelsEndpoint(repository, modelClientFactory);
  await repository.setup(new AbortController().signal);
  const providerId = 'provider';

  assert.deepEqual(
    await saveProvider.handle(
      createRequest({
        body: {
          insert: true,
          id: providerId,
          name: 'Primary OpenAI',
          type: LlmProviderType.OPENAI,
          url: null,
          apiKey: 'top-secret',
          models: [{ name: 'admin-model', contextWindow: 131_072 }]
        }
      })
    ),
    {}
  );
  await saveUseCases.handle(
    createRequest({
      body: {
        assignments: [
          {
            useCase: LlmUseCase.ADMIN_CHAT,
            providerId,
            modelName: 'admin-model',
            modelContextWindow: 120_000,
            effectiveContextWindowPercent: 90
          },
          {
            useCase: LlmUseCase.USER_CHAT,
            providerId: null,
            modelName: null,
            effectiveContextWindowPercent: 95
          }
        ]
      }
    })
  );
  assert.equal(eventBus.events.length, 2);
  await assert.rejects(
    () =>
      saveUseCases.handle(
        createRequest({
          body: {
            assignments: [
              {
                useCase: LlmUseCase.ADMIN_CHAT,
                providerId,
                modelName: null,
                effectiveContextWindowPercent: 95
              }
            ]
          }
        })
      ),
    /Provider and model must either both be set or both be null/
  );
  await saveProvider.handle(
    createRequest({
      body: {
        insert: false,
        id: providerId,
        name: 'Primary OpenAI',
        type: LlmProviderType.OPENAI,
        url: null,
        apiKey: null,
        models: [{ name: 'admin-model', contextWindow: 131_072 }]
      }
    })
  );
  assert.equal(eventBus.events.length, 3);

  const response = await getConfiguration.handle(createRequest({}));
  assert.deepEqual(response.providers, [
    {
      id: providerId,
      name: 'Primary OpenAI',
      type: LlmProviderType.OPENAI,
      url: null,
      hasApiKey: true,
      models: [{ name: 'admin-model', contextWindow: 131_072 }]
    }
  ]);
  assert.equal('apiKey' in response.providers[0], false);
  assert.deepEqual(
    response.useCases.find(item => item.useCase === LlmUseCase.ADMIN_CHAT),
    {
      useCase: LlmUseCase.ADMIN_CHAT,
      providerId,
      modelName: 'admin-model',
      modelContextWindow: 120_000,
      effectiveContextWindowPercent: 90
    }
  );
  assert.equal(
    response.useCases.find(item => item.useCase === LlmUseCase.USER_CHAT),
    undefined
  );

  assert.deepEqual(
    await fetchModels.handle(createRequest({ body: { id: providerId, type: LlmProviderType.OPENAI, url: null, apiKey: null } })),
    {
      models: [{ name: 'model-a' }, { name: 'model-b', contextWindow: 131_072 }]
    }
  );
  assert.equal(modelClientFactory.apiKey, 'top-secret');
  assert.deepEqual(
    await fetchModels.handle(
      createRequest({
        body: {
          id: providerId,
          type: LlmProviderType.CODEX_APP_SERVER,
          url: 'ws://127.0.0.1:4500',
          apiKey: null
        }
      })
    ),
    { models: [{ name: 'model-a' }, { name: 'model-b', contextWindow: 131_072 }] }
  );
  assert.equal(modelClientFactory.apiKey, null);
  await assert.rejects(
    () =>
      fetchModels.handle(
        createRequest({
          body: {
            id: providerId,
            type: LlmProviderType.OPENAI_COMPATIBLE,
            url: 'https://other.example/v1',
            apiKey: null
          }
        })
      ),
    /API key must be entered/
  );
  await saveUseCases.handle(
    createRequest({
      body: {
        assignments: [
          {
            useCase: LlmUseCase.ADMIN_CHAT,
            providerId: null,
            modelName: null,
            effectiveContextWindowPercent: 95
          }
        ]
      }
    })
  );
  assert.deepEqual(await deleteProvider.handle(createRequest({ params: { id: providerId } })), { id: providerId });
  assert.equal(eventBus.events.length, 5);
  db.close();
});

class RecordingEventBus extends EventBus {
  public readonly events: LlmConfigurationChangedEvent[] = [];

  public override async publish(event: Event): Promise<void> {
    if (event instanceof LlmConfigurationChangedEvent) {
      this.events.push(event);
    }
  }
}

class FakeModelLlmClientFactory extends LlmClientFactory {
  public apiKey: string | null = null;

  public override createForProvider(provider: LlmProviderConfiguration): LlmClient {
    this.apiKey = provider.apiKey;
    return {
      complete: async () => {
        throw new Error('Not implemented');
      },
      dispose: () => undefined,
      getModels: async () => [{ name: 'model-a' }, { name: 'model-b', contextWindow: 131_072 }]
    };
  }
}

function createRequest(options: { body?: unknown; params?: Record<string, string> }): Request {
  return Object.assign(new EventEmitter(), {
    params: options.params ?? {},
    body: options.body
  }) as unknown as Request;
}
