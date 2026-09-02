import { LlmProviderType } from './llm-provider-type';

const POLICIES: Record<
  LlmProviderType,
  {
    apiKeyRequired: boolean;
    urlProtocols: readonly string[];
    urlExample: string | null;
  }
> = {
  [LlmProviderType.OPENAI]: {
    apiKeyRequired: true,
    urlProtocols: [],
    urlExample: null
  },
  [LlmProviderType.ANTHROPIC]: {
    apiKeyRequired: true,
    urlProtocols: [],
    urlExample: null
  },
  [LlmProviderType.OPENAI_COMPATIBLE]: {
    apiKeyRequired: true,
    urlProtocols: ['http:', 'https:'],
    urlExample: 'https://gateway.example/v1'
  },
  [LlmProviderType.CODEX_APP_SERVER]: {
    apiKeyRequired: false,
    urlProtocols: ['ws:', 'wss:'],
    urlExample: 'ws://127.0.0.1:4500'
  }
};

export class LlmProviderPolicy {
  public static requiresApiKey(providerType: LlmProviderType): boolean {
    return POLICIES[providerType].apiKeyRequired;
  }

  public static requiresUrl(providerType: LlmProviderType): boolean {
    return POLICIES[providerType].urlProtocols.length > 0;
  }

  public static getUrlProtocols(providerType: LlmProviderType): readonly string[] {
    return POLICIES[providerType].urlProtocols;
  }

  public static supportsUrlProtocol(providerType: LlmProviderType, protocol: string): boolean {
    return this.getUrlProtocols(providerType).includes(protocol);
  }

  public static getUrlExample(providerType: LlmProviderType): string {
    const example = POLICIES[providerType].urlExample;
    if (!example) {
      throw new Error('URL is not applicable for this provider type');
    }
    return example;
  }
}
