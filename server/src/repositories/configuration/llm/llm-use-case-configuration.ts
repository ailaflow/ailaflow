import { LlmProviderConfigurationError } from './llm-provider-configuration';
import { LlmUseCase, LlmUseCaseConfigurationValidator } from '@aila/model';

export class LlmUseCaseConfiguration {
  public static create(
    useCase: LlmUseCase,
    providerId: string | null,
    modelName: string | null,
    modelContextWindow: number | undefined,
    effectiveContextWindowPercent: number
  ): LlmUseCaseConfiguration {
    const error = LlmUseCaseConfigurationValidator.validateProviderAndModel(providerId, modelName);
    if (error) {
      throw new LlmProviderConfigurationError(error);
    }
    return new LlmUseCaseConfiguration(useCase, providerId!, modelName!, modelContextWindow, effectiveContextWindowPercent);
  }

  public constructor(
    public readonly useCase: LlmUseCase,
    public providerId: string,
    public modelName: string,
    public modelContextWindow: number | undefined,
    public effectiveContextWindowPercent: number
  ) {
    validate(providerId, modelName, modelContextWindow, effectiveContextWindowPercent);
  }

  public update(
    providerId: string,
    modelName: string,
    modelContextWindow: number | undefined,
    effectiveContextWindowPercent: number
  ): void {
    validate(providerId, modelName, modelContextWindow, effectiveContextWindowPercent);
    this.providerId = providerId;
    this.modelName = modelName;
    this.modelContextWindow = modelContextWindow;
    this.effectiveContextWindowPercent = effectiveContextWindowPercent;
  }
}

function validate(
  providerId: string,
  modelName: string,
  modelContextWindow: number | undefined,
  effectiveContextWindowPercent: number
): void {
  const error =
    LlmUseCaseConfigurationValidator.validateProviderId(providerId) ??
    LlmUseCaseConfigurationValidator.validateModelName(modelName) ??
    LlmUseCaseConfigurationValidator.validateModelContextWindow(modelContextWindow) ??
    LlmUseCaseConfigurationValidator.validateEffectiveContextWindowPercent(effectiveContextWindowPercent);
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
}
