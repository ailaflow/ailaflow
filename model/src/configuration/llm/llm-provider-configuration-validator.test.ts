import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmProviderType } from './llm-provider-type';
import { LlmProviderConfigurationValidator } from './llm-provider-configuration-validator';

test('validates LLM provider fields', () => {
  assert.equal(LlmProviderConfigurationValidator.validateName('Provider'), null);
  assert.match(LlmProviderConfigurationValidator.validateName('')!, /between 1 and 64/);
  assert.match(LlmProviderConfigurationValidator.validateName(' Provider')!, /whitespace/);
  assert.equal(LlmProviderConfigurationValidator.validateApiKey(LlmProviderType.OPENAI, 'secret'), null);
  assert.match(LlmProviderConfigurationValidator.validateApiKey(LlmProviderType.OPENAI, '')!, /required/);
  assert.match(LlmProviderConfigurationValidator.validateApiKey(LlmProviderType.OPENAI, ' secret')!, /whitespace/);
  assert.equal(LlmProviderConfigurationValidator.validateApiKey(LlmProviderType.CODEX_APP_SERVER, null), null);
  assert.match(LlmProviderConfigurationValidator.validateApiKey(LlmProviderType.CODEX_APP_SERVER, 'secret')!, /not supported/);
  assert.equal(LlmProviderConfigurationValidator.validateUrl(LlmProviderType.OPENAI_COMPATIBLE, 'https://gateway.example/v1'), null);
  assert.match(LlmProviderConfigurationValidator.validateUrl(LlmProviderType.OPENAI_COMPATIBLE, null)!, /required/);
  assert.equal(LlmProviderConfigurationValidator.validateUrl(LlmProviderType.CODEX_APP_SERVER, 'ws://127.0.0.1:4500'), null);
  assert.match(LlmProviderConfigurationValidator.validateUrl(LlmProviderType.CODEX_APP_SERVER, 'ws://127.0.0.1:4500/')!, /canonical/);
  assert.match(LlmProviderConfigurationValidator.validateUrl(LlmProviderType.CODEX_APP_SERVER, 'http://127.0.0.1:4500')!, /protocol/);
  assert.equal(LlmProviderConfigurationValidator.validateModels([{ name: 'model-a', contextWindow: 131_072 }]), null);
  assert.match(LlmProviderConfigurationValidator.validateModels([{ name: ' ' }])!, /cannot be empty/);
  assert.match(LlmProviderConfigurationValidator.validateModels([{ name: 'model-a' }, { name: 'model-a' }])!, /unique/);
  assert.match(LlmProviderConfigurationValidator.validateModels([{ name: 'model-a', contextWindow: 0 }])!, /positive integers/);
});

test('requires a new API key when the provider connection changes', () => {
  assert.equal(
    LlmProviderConfigurationValidator.validateConnectionForUpdate(
      { type: LlmProviderType.OPENAI, url: null, hasApiKey: true },
      { type: LlmProviderType.OPENAI, url: null, apiKey: null }
    ),
    null
  );
  assert.match(
    LlmProviderConfigurationValidator.validateConnectionForUpdate(
      { type: LlmProviderType.OPENAI, url: null, hasApiKey: true },
      { type: LlmProviderType.OPENAI_COMPATIBLE, url: 'https://gateway.example/v1', apiKey: null }
    )!,
    /must be entered/
  );
  assert.equal(
    LlmProviderConfigurationValidator.validateConnectionForUpdate(
      { type: LlmProviderType.OPENAI, url: null, hasApiKey: true },
      { type: LlmProviderType.CODEX_APP_SERVER, url: 'ws://127.0.0.1:4500', apiKey: null }
    ),
    null
  );
});
