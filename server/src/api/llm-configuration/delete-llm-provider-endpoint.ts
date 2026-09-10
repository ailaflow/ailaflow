import { DeleteLlmProviderResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { EventBus } from '../../events/event-bus';
import { LlmConfigurationChangedEvent } from '../../events/llm-configuration/llm-configuration-changed-event';
import {
  LlmConfigurationRepository,
  LlmConfigurationRepositoryError
} from '../../repositories/configuration/llm/llm-configuration-repository';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteLlmProviderEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/llm-providers/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly repository: LlmConfigurationRepository,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<DeleteLlmProviderResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const id = String(req.params.id);
    try {
      if (!(await this.repository.deleteProvider(abortSignal, id))) {
        throw new EndpointError('LLM provider not found', 404);
      }
      await this.eventBus.publish(new LlmConfigurationChangedEvent());
      return { id };
    } catch (error) {
      if (error instanceof LlmConfigurationRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}
