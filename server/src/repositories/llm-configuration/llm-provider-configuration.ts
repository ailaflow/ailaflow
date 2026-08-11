import { LlmProviderConfigurationValidator } from '@aila/model';
import { randomBytes } from 'crypto';
import { LlmProviderType } from '@aila/model';

export class LlmProviderConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = LlmProviderConfigurationError.name;
  }
}

export class LlmProviderConfiguration {
  public static create(data: {
    id?: string;
    name: string;
    type: LlmProviderType;
    baseUrl: string | null;
    apiKey: string | undefined;
    models: string[];
  }): LlmProviderConfiguration {
    return new LlmProviderConfiguration(
      data.id ?? randomBytes(24).toString('hex'),
      normalizeName(data.name),
      data.type,
      normalizeBaseUrl(data.type, data.baseUrl),
      normalizeApiKey(data.apiKey),
      normalizeModels(data.models)
    );
  }

  public constructor(
    public readonly id: string,
    public name: string,
    public type: LlmProviderType,
    public baseUrl: string | null,
    public apiKey: string,
    public models: string[]
  ) {}

  public update(data: { name: string; type: LlmProviderType; baseUrl: string | null; apiKey?: string; models: string[] }): void {
    const name = normalizeName(data.name);
    const baseUrl = normalizeBaseUrl(data.type, data.baseUrl);
    throwIfInvalid(
      LlmProviderConfigurationValidator.validateApiKeyForUpdate(
        { type: this.type, baseUrl: this.baseUrl },
        { type: data.type, baseUrl, apiKey: data.apiKey }
      )
    );
    const apiKey = data.apiKey === undefined ? this.apiKey : normalizeApiKey(data.apiKey);
    const models = normalizeModels(data.models);
    this.name = name;
    this.type = data.type;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.models = models;
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  throwIfInvalid(LlmProviderConfigurationValidator.validateName(trimmed));
  return trimmed;
}

function normalizeApiKey(apiKey: string | undefined): string {
  const trimmed = apiKey?.trim();
  throwIfInvalid(LlmProviderConfigurationValidator.validateApiKey(trimmed));
  return trimmed!;
}

function normalizeBaseUrl(type: LlmProviderType, baseUrl: string | null): string | null {
  throwIfInvalid(LlmProviderConfigurationValidator.validateBaseUrl(type, baseUrl));
  if (baseUrl === null) {
    return null;
  }
  return new URL(baseUrl).toString().replace(/\/$/, '');
}

function normalizeModels(models: string[]): string[] {
  throwIfInvalid(LlmProviderConfigurationValidator.validateModels(models));
  const normalized = models.map(model => model.trim());
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
}

function throwIfInvalid(error: string | null): void {
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
}
