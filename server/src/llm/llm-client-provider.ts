import { LlmConfigurationRepository } from '../repositories/configuration/llm/llm-configuration-repository';
import { LlmUseCase } from '@ailaflow/shared';
import { ConfiguredLlmClient, LlmClientFactory } from './llm-client-factory';

export class LlmClientProvider {
  private readonly clients = new Map<LlmUseCase, ConfiguredLlmClient>();

  public constructor(
    private readonly repository: LlmConfigurationRepository,
    private readonly factory: LlmClientFactory
  ) {}

  public async get(signal: AbortSignal, useCase: LlmUseCase): Promise<ConfiguredLlmClient> {
    let client = this.clients.get(useCase);
    if (client) {
      return client;
    }

    const configuration = (await this.repository.get(signal)).getUseCase(useCase);
    client = this.factory.create(configuration);
    this.clients.set(useCase, client);
    return client;
  }

  public flushAll() {
    for (const client of this.clients.values()) {
      client.client.dispose();
    }
    this.clients.clear();
  }
}
