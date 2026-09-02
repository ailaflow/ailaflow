import { LlmProviderPolicy } from './llm-provider-policy';
import { LlmProviderType } from './llm-provider-type';

export interface LlmProviderConnectionValidationData {
  type: LlmProviderType;
  url: string | null;
  apiKey: string | null;
}

export class LlmProviderConfigurationValidator {
  public static validateConnectionForUpdate(
    current: { type: LlmProviderType; url: string | null; hasApiKey: boolean },
    next: LlmProviderConnectionValidationData
  ): string | null {
    const canReuseApiKey = current.hasApiKey && current.type === next.type && current.url === next.url;
    if (LlmProviderPolicy.requiresApiKey(next.type) && next.apiKey === null && !canReuseApiKey) {
      return 'API key must be entered when changing the provider type or endpoint';
    }
    return this.validateConnection(next.type, next.url, next.apiKey, canReuseApiKey);
  }

  public static validateName(name: string): string | null {
    if (name.length < 1 || name.length > 64) {
      return 'Provider name must be between 1 and 64 characters';
    }
    return /^\s|\s$/.test(name) ? 'Provider name cannot start or end with whitespace' : null;
  }

  public static validateConnection(
    type: LlmProviderType,
    url: string | null,
    apiKey: string | null,
    hasExistingApiKey = false
  ): string | null {
    return this.validateUrl(type, url) ?? this.validateApiKey(type, apiKey, hasExistingApiKey);
  }

  public static validateApiKey(type: LlmProviderType, apiKey: string | null, hasExistingApiKey = false): string | null {
    if (!LlmProviderPolicy.requiresApiKey(type)) {
      return apiKey === null ? null : 'API key is not supported for this provider type';
    }
    if (apiKey === null) {
      return hasExistingApiKey ? null : 'API key is required';
    }
    if (apiKey.length === 0) {
      return 'API key is required';
    }
    return /^\s|\s$/.test(apiKey) ? 'API key cannot start or end with whitespace' : null;
  }

  public static validateUrl(type: LlmProviderType, url: string | null): string | null {
    if (!LlmProviderPolicy.requiresUrl(type)) {
      return url === null ? null : 'URL is not supported for this provider type';
    }
    if (url === null || url.length === 0) {
      return LlmProviderPolicy.supportsUrlProtocol(type, 'ws:')
        ? 'WebSocket URL is required for a Codex app-server provider'
        : 'URL is required for an OpenAI-compatible provider';
    }
    try {
      const parsedUrl = new URL(url);
      const protocols = LlmProviderPolicy.getUrlProtocols(type);
      if (!LlmProviderPolicy.supportsUrlProtocol(type, parsedUrl.protocol)) {
        return `URL protocol must be ${protocols.join(' or ')}`;
      }
      return canonicalizeUrl(parsedUrl) === url ? null : 'URL must be canonical';
    } catch {
      return 'URL is invalid';
    }
  }

  public static validateModels(models: Array<{ name: string; contextWindow?: number }>): string | null {
    if (models.some(model => model.name.length === 0 || /^\s+$/.test(model.name))) {
      return 'Model identifiers cannot be empty';
    }
    if (new Set(models.map(model => model.name)).size !== models.length) {
      return 'Model identifiers must be unique';
    }
    return models.some(
      model => model.contextWindow !== undefined && (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)
    )
      ? 'Model context windows must be positive integers'
      : null;
  }
}

function canonicalizeUrl(url: URL): string {
  return url.toString().replace(/\/$/, '');
}
