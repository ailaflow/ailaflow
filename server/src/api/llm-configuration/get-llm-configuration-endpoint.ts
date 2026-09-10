import { GetLlmConfigurationResponse } from '@ailaflow/model';
import { Request } from 'express';
import { LlmConfigurationRepository } from '../../repositories/configuration/llm/llm-configuration-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetLlmConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/llm-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly repository: LlmConfigurationRepository) {}

  public async handle(req: Request): Promise<GetLlmConfigurationResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const configuration = await this.repository.get(abortSignal);

    return {
      providers: configuration.providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        url: provider.url,
        hasApiKey: Boolean(provider.apiKey),
        models: provider.models
      })),
      useCases: configuration.useCases.map(assignment => ({
        useCase: assignment.useCase,
        providerId: assignment.providerId,
        modelName: assignment.modelName,
        modelContextWindow: assignment.modelContextWindow,
        effectiveContextWindowPercent: assignment.effectiveContextWindowPercent
      }))
    };
  }
}
