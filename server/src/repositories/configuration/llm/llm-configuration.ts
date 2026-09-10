import { LlmProviderConfiguration, LlmProviderConfigurationError } from './llm-provider-configuration';
import { LlmUseCaseConfiguration } from './llm-use-case-configuration';
import { LlmUseCase, strLlmUseCase } from '@ailaflow/shared';

export interface ResolvedLlmUseCaseConfiguration {
  provider: LlmProviderConfiguration;
  modelName: string;
  modelContextWindow?: number;
  effectiveContextWindowPercent: number;
}

export class LlmConfiguration {
  public constructor(
    public readonly providers: ReadonlyArray<LlmProviderConfiguration>,
    public readonly useCases: ReadonlyArray<LlmUseCaseConfiguration>
  ) {}

  public getProvider(id: string): LlmProviderConfiguration {
    const provider = this.providers.find(item => item.id === id);
    if (!provider) {
      throw new LlmProviderConfigurationError('LLM provider not found');
    }
    return provider;
  }

  public getUseCase(useCase: LlmUseCase): ResolvedLlmUseCaseConfiguration {
    const assignment = this.useCases.find(item => item.useCase === useCase);
    if (!assignment) {
      throw new LlmProviderConfigurationError(`LLM use case "${strLlmUseCase(useCase)}" is not configured`);
    }
    return this.resolveUseCase(assignment);
  }

  public resolveUseCase(assignment: LlmUseCaseConfiguration): ResolvedLlmUseCaseConfiguration {
    const provider = this.getProvider(assignment.providerId);
    if (!provider.models.some(model => model.name === assignment.modelName)) {
      throw new LlmProviderConfigurationError(`Model "${assignment.modelName}" is not available for provider "${provider.name}"`);
    }
    return {
      provider,
      modelName: assignment.modelName,
      modelContextWindow: assignment.modelContextWindow,
      effectiveContextWindowPercent: assignment.effectiveContextWindowPercent
    };
  }
}
