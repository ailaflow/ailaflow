import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmProviderType } from './llm-provider-type';
import { LlmProviderConfigurationValidator } from './llm-provider-configuration-validator';

test('validates LLM provider fields', () => {
  assert.equal(LlmProviderConfigurationValidator.validateName('Provider'), null);
  assert.match(LlmProviderConfigurationValidator.validateName('')!, /between 1 and 64/);
  assert.equal(LlmProviderConfigurationValidator.validateApiKey('secret'), null);
  assert.match(LlmProviderConfigurationValidator.validateApiKey('')!, /required/);
  assert.equal(LlmProviderConfigurationValidator.validateBaseUrl(LlmProviderType.OPENAI_COMPATIBLE, 'https://gateway.example/v1'), null);
  assert.match(LlmProviderConfigurationValidator.validateBaseUrl(LlmProviderType.OPENAI_COMPATIBLE, null)!, /required/);
  assert.equal(LlmProviderConfigurationValidator.validateModels([{ name: 'model-a', contextWindow: 131_072 }]), null);
  assert.match(LlmProviderConfigurationValidator.validateModels([{ name: ' ' }])!, /cannot be empty/);
  assert.match(LlmProviderConfigurationValidator.validateModels([{ name: 'model-a', contextWindow: 0 }])!, /positive integers/);
});

test('requires a new API key when the provider connection changes', () => {
  assert.equal(
    LlmProviderConfigurationValidator.validateApiKeyForUpdate(
      { type: LlmProviderType.OPENAI, baseUrl: null },
      { type: LlmProviderType.OPENAI, baseUrl: null, apiKey: undefined }
    ),
    null
  );
  assert.match(
    LlmProviderConfigurationValidator.validateApiKeyForUpdate(
      { type: LlmProviderType.OPENAI, baseUrl: null },
      { type: LlmProviderType.OPENAI_COMPATIBLE, baseUrl: 'https://gateway.example/v1', apiKey: undefined }
    )!,
    /must be entered/
  );
});
