import type { LlmMessage, ToolDescriptor } from '@aibindkit/core';
import type { LlmClient, LlmCompleteResult, LlmModelSettings } from '@aibindkit/llm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmConfiguration } from '../repositories/configuration/llm/llm-configuration';
import { LlmConfigurationRepository } from '../repositories/configuration/llm/llm-configuration-repository';
import { LlmProviderConfiguration } from '../repositories/configuration/llm/llm-provider-configuration';
import { LlmProviderType, LlmUseCase } from '@ailaflow/shared';
import { LlmUseCaseConfiguration } from '../repositories/configuration/llm/llm-use-case-configuration';
import { ConfiguredLlmClient, LlmClientFactory } from './llm-client-factory';
import { LlmClientProvider } from './llm-client-provider';

class FakeLlmClient implements LlmClient {
  public readonly completions: LlmMessage[][] = [];
  public isDisposed = false;

  public async complete(
    _: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    __: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult> {
    this.completions.push(messages);
    return { message: { role: 'assistant', content: modelSettings.name, refusal: null } };
  }

  public async getModels(_: AbortSignal): Promise<Array<{ name: string }>> {
    return [{ name: 'model-a' }, { name: 'model-b' }];
  }

  public dispose(): void {
    this.isDisposed = true;
  }
}

class FakeLlmClientFactory extends LlmClientFactory {
  public readonly clients: FakeLlmClient[] = [];

  public override create(configuration: {
    modelName: string;
    modelContextWindow?: number;
    effectiveContextWindowPercent: number;
  }): ConfiguredLlmClient {
    const client = new FakeLlmClient();
    this.clients.push(client);
    return {
      client,
      modelSettings: {
        name: configuration.modelName,
        contextWindow: configuration.modelContextWindow,
        effectiveContextWindowPercent: configuration.effectiveContextWindowPercent
      }
    };
  }
}

test('returns the same configured client until all clients are flushed', async () => {
  const providerConfiguration = new LlmProviderConfiguration('provider', 'Provider', LlmProviderType.OPENAI, null, 'secret', [
    { name: 'model-a' },
    { name: 'model-b' }
  ]);
  let model = 'model-a';
  const repository = {
    get: async () =>
      new LlmConfiguration(
        [providerConfiguration],
        [new LlmUseCaseConfiguration(LlmUseCase.ADMIN_CHAT, providerConfiguration.id, model, 131_072, 95)]
      )
  } as unknown as LlmConfigurationRepository;
  const factory = new FakeLlmClientFactory();
  const provider = new LlmClientProvider(repository, factory);
  const signal = new AbortController().signal;

  const first = await provider.get(signal, LlmUseCase.ADMIN_CHAT);
  assert.equal(await provider.get(signal, LlmUseCase.ADMIN_CHAT), first);

  const completeHistory: LlmMessage[] = [
    { role: 'system', content: 'System' },
    { role: 'user', content: 'Question' },
    { role: 'assistant', content: 'Previous answer', refusal: null },
    { role: 'user', content: 'Follow-up' }
  ];
  await first.client.complete(signal, first.modelSettings, completeHistory, undefined);

  model = 'model-b';
  provider.flushAll();
  assert.equal(factory.clients[0].isDisposed, true);
  const second = await provider.get(signal, LlmUseCase.ADMIN_CHAT);
  const result = await second.client.complete(signal, second.modelSettings, completeHistory, undefined);

  assert.notEqual(second, first);
  assert.equal(result.message.content, 'model-b');
  assert.equal(factory.clients.length, 2);
  assert.equal(factory.clients[1].completions[0], completeHistory);
});
