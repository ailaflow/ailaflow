import { HttpClient } from '@aibindkit/react';
import type {
  DeleteLlmProviderResponse,
  FetchLlmProviderModelsRequest,
  FetchLlmProviderModelsResponse,
  GetLlmConfigurationResponse,
  SaveLlmProviderRequest,
  SaveLlmUseCaseAssignmentsRequest
} from '@ailaflow/shared';

export class LlmConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(signal: AbortSignal): Promise<GetLlmConfigurationResponse> {
    return this.client.json(signal, 'GET', '/api/llm-configuration');
  }

  public saveProvider(signal: AbortSignal, request: SaveLlmProviderRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/llm-provider', request);
  }

  public fetchProviderModels(signal: AbortSignal, request: FetchLlmProviderModelsRequest): Promise<FetchLlmProviderModelsResponse> {
    return this.client.json(signal, 'POST', '/api/llm-provider/models', request);
  }

  public deleteProvider(signal: AbortSignal, id: string): Promise<DeleteLlmProviderResponse> {
    return this.client.json(signal, 'DELETE', `/api/llm-providers/${encodeURIComponent(id)}`);
  }

  public saveUseCaseAssignments(signal: AbortSignal, request: SaveLlmUseCaseAssignmentsRequest): Promise<void> {
    return this.client.json(signal, 'POST', '/api/llm-use-case-assignments', request);
  }
}
