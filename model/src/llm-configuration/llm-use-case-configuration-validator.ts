export class LlmUseCaseConfigurationValidator {
  public static validateProviderAndModel(providerId: string | null, modelName: string | null): string | null {
    return providerId === null || modelName === null ? 'Provider and model must either both be set or both be null' : null;
  }

  public static validateProviderId(providerId: string): string | null {
    return providerId ? null : 'Provider is required';
  }

  public static validateModelName(modelName: string): string | null {
    return modelName.trim() ? null : 'Model is required';
  }

  public static validateModelContextWindow(modelContextWindow: number | undefined): string | null {
    return modelContextWindow === undefined || (Number.isSafeInteger(modelContextWindow) && modelContextWindow > 0)
      ? null
      : 'Model context window must be a positive integer';
  }

  public static validateEffectiveContextWindowPercent(effectiveContextWindowPercent: number): string | null {
    return Number.isSafeInteger(effectiveContextWindowPercent) && effectiveContextWindowPercent >= 1 && effectiveContextWindowPercent <= 100
      ? null
      : 'Effective context window percent must be an integer between 1 and 100';
  }
}
