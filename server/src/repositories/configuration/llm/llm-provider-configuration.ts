import { LlmProviderConfigurationValidator } from '@aila/model';
import { randomUUID } from 'crypto';
import { LlmProviderPolicy, LlmProviderType } from '@aila/model';

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
    url: string | null;
    apiKey: string | null;
    models: LlmModelProviderConfiguration[];
  }): LlmProviderConfiguration {
    throwIfInvalid(LlmProviderConfigurationValidator.validateName(data.name));
    throwIfInvalid(LlmProviderConfigurationValidator.validateConnection(data.type, data.url, data.apiKey));
    throwIfInvalid(LlmProviderConfigurationValidator.validateModels(data.models));
    return new LlmProviderConfiguration(data.id ?? randomUUID(), data.name, data.type, data.url, data.apiKey, data.models);
  }

  public constructor(
    public readonly id: string,
    public name: string,
    public type: LlmProviderType,
    public url: string | null,
    public apiKey: string | null,
    public models: LlmModelProviderConfiguration[]
  ) {}

  public update(data: {
    name: string;
    type: LlmProviderType;
    url: string | null;
    apiKey: string | null;
    models: LlmModelProviderConfiguration[];
  }): void {
    throwIfInvalid(LlmProviderConfigurationValidator.validateName(data.name));
    throwIfInvalid(
      LlmProviderConfigurationValidator.validateConnectionForUpdate(
        { type: this.type, url: this.url, hasApiKey: this.apiKey !== null },
        data
      )
    );
    throwIfInvalid(LlmProviderConfigurationValidator.validateModels(data.models));
    const apiKey = data.apiKey === null && LlmProviderPolicy.requiresApiKey(data.type) ? this.apiKey : data.apiKey;
    this.name = data.name;
    this.type = data.type;
    this.url = data.url;
    this.apiKey = apiKey;
    this.models = data.models;
  }
}

function throwIfInvalid(error: string | null): void {
  if (error) {
    throw new LlmProviderConfigurationError(error);
  }
}
