import { saveLlmProviderRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { EventBus } from '../../events/event-bus';
import { LlmConfigurationChangedEvent } from '../../events/llm-configuration/llm-configuration-changed-event';
import {
  LlmConfigurationRepository,
  LlmConfigurationRepositoryError
} from '../../repositories/configuration/llm/llm-configuration-repository';
import { LlmProviderConfiguration, LlmProviderConfigurationError } from '../../repositories/configuration/llm/llm-provider-configuration';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveLlmProviderEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/llm-provider';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly repository: LlmConfigurationRepository,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<object> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveLlmProviderRequestSchema, req.body);
    try {
      let provider: LlmProviderConfiguration;
      if (request.insert) {
        provider = LlmProviderConfiguration.create({
          id: request.id,
          name: request.name,
          type: request.type,
          url: request.url,
          apiKey: request.apiKey,
          models: request.models
        });
        await this.repository.insertProvider(signal, provider);
      } else {
        const existingProvider = await this.repository.tryGetProvider(signal, request.id!);
        if (!existingProvider) {
          throw new EndpointError('LLM provider not found', 404);
        }
        provider = existingProvider;
        provider.update({
          name: request.name,
          type: request.type,
          url: request.url,
          apiKey: request.apiKey,
          models: request.models
        });
        await this.repository.updateProvider(signal, provider);
      }
      await this.eventBus.publish(new LlmConfigurationChangedEvent());
      return {};
    } catch (error) {
      if (error instanceof LlmProviderConfigurationError || error instanceof LlmConfigurationRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}
