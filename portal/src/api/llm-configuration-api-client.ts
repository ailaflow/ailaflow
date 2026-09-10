import { HttpClient } from '@aibindkit/react';
import type {
  DeleteLlmProviderResponse,
  FetchLlmProviderModelsRequest,
  FetchLlmProviderModelsResponse,
  GetLlmConfigurationResponse,
  SaveLlmProviderRequest,
  SaveLlmUseCaseAssignmentsRequest
} from '@ailaflow/model';

export class LlmConfigurationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public get(abortSignal: AbortSignal): Promise<GetLlmConfigurationResponse> {
    return this.client.json(abortSignal, 'GET', '/api/llm-configuration');
  }

  public saveProvider(abortSignal: AbortSignal, request: SaveLlmProviderRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/llm-provider', request);
  }

  public fetchProviderModels(abortSignal: AbortSignal, request: FetchLlmProviderModelsRequest): Promise<FetchLlmProviderModelsResponse> {
    return this.client.json(abortSignal, 'POST', '/api/llm-provider/models', request);
  }

  public deleteProvider(abortSignal: AbortSignal, id: string): Promise<DeleteLlmProviderResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/llm-providers/${encodeURIComponent(id)}`);
  }

  public saveUseCaseAssignments(abortSignal: AbortSignal, request: SaveLlmUseCaseAssignmentsRequest): Promise<void> {
    return this.client.json(abortSignal, 'POST', '/api/llm-use-case-assignments', request);
  }
}
