import { LlmProviderConfigurationValidator } from '@aila/model';
import { randomBytes } from 'crypto';
import { LlmProviderType } from '@aila/model';

export class LlmProviderConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = LlmProviderConfigurationError.name;
  }
}

export interface LlmModelProviderConfiguration {
  name: string;
  contextWindow?: number;
}

export class LlmProviderConfiguration {
  public static create(data: {
    id?: string;
    name: string;
    type: LlmProviderType;
    baseUrl: string | null;
    apiKey: string | undefined;
    models: LlmModelProviderConfiguration[];
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
    public models: LlmModelProviderConfiguration[]
  ) {}

  public update(data: {
    name: string;
    type: LlmProviderType;
    baseUrl: string | null;
    apiKey?: string;
    models: LlmModelProviderConfiguration[];
  }): void {
    const name = normalizeName(data.name);
    const baseUrl = normalizeBaseUrl(data.type, data.baseUrl);
    const error = LlmProviderConfigurationValidator.validateApiKeyForUpdate(
      { type: this.type, baseUrl: this.baseUrl },
      { type: data.type, baseUrl, apiKey: data.apiKey }
    );
    if (error) {
      throw new LlmProviderConfigurationError(error);
    }
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
  const error = LlmProviderConfigurationValidator.validateName(trimmed);
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
  return trimmed;
}

function normalizeApiKey(apiKey: string | undefined): string {
  const trimmed = apiKey?.trim();
  const error = LlmProviderConfigurationValidator.validateApiKey(trimmed);
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
  return trimmed!;
}

function normalizeBaseUrl(type: LlmProviderType, baseUrl: string | null): string | null {
  const error = LlmProviderConfigurationValidator.validateBaseUrl(type, baseUrl);
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
  if (baseUrl === null) {
    return null;
  }
  return new URL(baseUrl).toString().replace(/\/$/, '');
}

function normalizeModels(models: LlmModelProviderConfiguration[]): LlmModelProviderConfiguration[] {
  const error = LlmProviderConfigurationValidator.validateModels(models);
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
  const normalized = new Map<string, LlmModelProviderConfiguration>();
  for (const model of models) {
    const existing = normalized.get(model.name);
    const contextWindow = model.contextWindow ?? existing?.contextWindow;
    normalized.set(model.name, contextWindow === undefined ? { name: model.name } : { name: model.name, contextWindow });
  }
  return [...normalized.values()].sort((a, b) => a.name.localeCompare(b.name));
}
