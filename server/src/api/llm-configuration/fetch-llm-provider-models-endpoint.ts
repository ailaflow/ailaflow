import { FetchLlmProviderModelsResponse, fetchLlmProviderModelsRequestSchema } from '@aila/model';
import { LlmClientError } from '@aibindkit/llm';
import { Request } from 'express';
import { LlmClientFactory } from '../../llm/llm-client-factory';
import { LlmConfigurationRepository } from '../../repositories/llm-configuration/llm-configuration-repository';
import { LlmProviderConfiguration, LlmProviderConfigurationError } from '../../repositories/llm-configuration/llm-provider-configuration';
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
      if (!apiKey && request.id) {
        const existing = await this.repository.tryGetProvider(abortSignal, request.id);
        if (!existing) {
          throw new EndpointError('LLM provider not found', 404);
        }
        if (existing.type !== request.type || existing.baseUrl !== request.baseUrl) {
          throw new LlmProviderConfigurationError('API key must be entered when changing the provider type or endpoint');
        }
        apiKey = existing.apiKey;
      }
      const provider = LlmProviderConfiguration.create({
        name: 'Model fetch',
        type: request.type,
        baseUrl: request.baseUrl,
        apiKey,
        models: []
      });
      return { models: await this.clientFactory.createForProvider(provider).getModels(abortSignal) };
    } catch (error) {
      if (error instanceof LlmProviderConfigurationError || error instanceof LlmClientError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}
