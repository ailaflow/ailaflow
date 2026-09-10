import { FetchLlmProviderModelsResponse, LlmProviderPolicy, fetchLlmProviderModelsRequestSchema } from '@ailaflow/shared';
import { LlmClientError } from '@aibindkit/llm';
import { Request } from 'express';
import { LlmClientFactory } from '../../llm/llm-client-factory';
import { LlmConfigurationRepository } from '../../repositories/configuration/llm/llm-configuration-repository';
import { LlmProviderConfiguration, LlmProviderConfigurationError } from '../../repositories/configuration/llm/llm-provider-configuration';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class FetchLlmProviderModelsEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/llm-provider/models';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly repository: LlmConfigurationRepository,
    private readonly clientFactory: LlmClientFactory
  ) {}

  public async handle(req: Request): Promise<FetchLlmProviderModelsResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(fetchLlmProviderModelsRequestSchema, req.body);
    try {
      let apiKey = request.apiKey;
      if (!apiKey && request.id && LlmProviderPolicy.requiresApiKey(request.type)) {
        const existing = await this.repository.tryGetProvider(abortSignal, request.id);
        if (!existing) {
          throw new EndpointError('LLM provider not found', 404);
        }
        if (existing.type !== request.type || existing.url !== request.url) {
          throw new LlmProviderConfigurationError('API key must be entered when changing the provider type or endpoint');
        }
        apiKey = existing.apiKey;
      }
      const provider = LlmProviderConfiguration.create({
        name: 'Model fetch',
        type: request.type,
        url: request.url,
        apiKey,
        models: []
      });
      const client = this.clientFactory.createForProvider(provider);
      try {
        return { models: await client.getModels(abortSignal) };
      } finally {
        client.dispose();
      }
    } catch (error) {
      if (error instanceof LlmProviderConfigurationError || error instanceof LlmClientError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}
