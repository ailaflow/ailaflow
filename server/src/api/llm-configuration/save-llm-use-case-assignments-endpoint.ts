import { LlmUseCase, saveLlmUseCaseAssignmentsRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { EventBus } from '../../events/event-bus';
import { LlmConfigurationChangedEvent } from '../../events/llm-configuration/llm-configuration-changed-event';
import {
  LlmConfigurationRepository,
  LlmConfigurationRepositoryError
} from '../../repositories/configuration/llm/llm-configuration-repository';
import { LlmProviderConfigurationError } from '../../repositories/configuration/llm/llm-provider-configuration';
import { LlmUseCaseConfiguration } from '../../repositories/configuration/llm/llm-use-case-configuration';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveLlmUseCaseAssignmentsEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/llm-use-case-assignments';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly repository: LlmConfigurationRepository,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<object> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveLlmUseCaseAssignmentsRequestSchema, req.body);
    const seen = new Set<LlmUseCase>();
    const assignments: LlmUseCaseConfiguration[] = [];
    const removedUseCases: LlmUseCase[] = [];
    for (const item of request.assignments) {
      const useCase = item.useCase;
      if (seen.has(useCase)) {
        throw new EndpointError(`Duplicate LLM use case "${item.useCase}"`, 400);
      }
      seen.add(useCase);
      if (item.providerId === null && item.modelName === null) {
        removedUseCases.push(useCase);
        continue;
      }
      const configuration = LlmUseCaseConfiguration.create(
        useCase,
        item.providerId,
        item.modelName,
        item.modelContextWindow,
        item.effectiveContextWindowPercent
      );
      assignments.push(configuration);
    }
    try {
      const configuration = await this.repository.get(signal);
      for (const assignment of assignments) {
        configuration.resolveUseCase(assignment);
      }
      await this.repository.saveUseCases(signal, assignments, removedUseCases);
      await this.eventBus.publish(new LlmConfigurationChangedEvent());
      return {
        success: true
      };
    } catch (error) {
      if (error instanceof LlmProviderConfigurationError || error instanceof LlmConfigurationRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }
  }
}
