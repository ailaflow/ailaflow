import { LlmProviderConfigurationError } from './llm-provider-configuration';
import { LlmUseCase } from '@aila/model';

export class LlmUseCaseConfiguration {
  public static create(useCase: LlmUseCase, providerId: string | null, model: string | null): LlmUseCaseConfiguration | null {
    if (providerId === null && model === null) {
      return null;
    }
    if (providerId === null || model === null) {
      throw new LlmProviderConfigurationError('Provider and model must either both be set or both be null');
    }
    return new LlmUseCaseConfiguration(useCase, providerId, model);
  }

  public constructor(
    public readonly useCase: LlmUseCase,
    public providerId: string,
    public model: string
  ) {
    this.update(providerId, model);
  }

  public update(providerId: string, model: string): void {
    if (!providerId) {
      throw new LlmProviderConfigurationError('Provider is required');
    }
    const trimmedModel = model.trim();
    if (!trimmedModel) {
      throw new LlmProviderConfigurationError('Model is required');
    }
    this.providerId = providerId;
    this.model = trimmedModel;
  }
}
