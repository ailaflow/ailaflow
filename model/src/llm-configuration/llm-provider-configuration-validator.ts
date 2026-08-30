import { LlmProviderType } from './llm-provider-type';

export class LlmProviderConfigurationValidator {
  public static validateName(name: string): string | null {
    const trimmed = name.trim();
    return trimmed.length < 1 || trimmed.length > 64 ? 'Provider name must be between 1 and 64 characters' : null;
  }

  public static validateApiKey(apiKey: string | undefined): string | null {
    return apiKey?.trim() ? null : 'API key is required';
  }

  public static validateBaseUrl(type: LlmProviderType, baseUrl: string | null): string | null {
    if (type !== LlmProviderType.OPENAI_COMPATIBLE) {
      return baseUrl === null ? null : 'Base URL is only supported for OpenAI-compatible providers';
    }
    if (!baseUrl) {
      return 'Base URL is required for an OpenAI-compatible provider';
    }
    try {
      new URL(baseUrl);
      return null;
    } catch {
      return 'Base URL is invalid';
    }
  }

  public static validateModels(models: Array<{ name: string; contextWindow?: number }>): string | null {
    if (models.some(model => !model.name.trim())) {
      return 'Model identifiers cannot be empty';
    }
    return models.some(
      model => model.contextWindow !== undefined && (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)
    )
      ? 'Model context windows must be positive integers'
      : null;
  }

  public static validateApiKeyForUpdate(
    current: { type: LlmProviderType; baseUrl: string | null },
    next: { type: LlmProviderType; baseUrl: string | null; apiKey: string | undefined }
  ): string | null {
    return (next.type !== current.type || next.baseUrl !== current.baseUrl) && next.apiKey === undefined
      ? 'API key must be entered when changing the provider type or endpoint'
      : null;
  }
}
