import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmProviderPolicy } from './llm-provider-policy';
import { LlmProviderType } from './llm-provider-type';

test('describes LLM provider credentials and URL policies', () => {
  assert.equal(LlmProviderPolicy.requiresApiKey(LlmProviderType.OPENAI), true);
  assert.equal(LlmProviderPolicy.requiresUrl(LlmProviderType.OPENAI), false);

  assert.equal(LlmProviderPolicy.requiresApiKey(LlmProviderType.OPENAI_COMPATIBLE), true);
  assert.equal(LlmProviderPolicy.requiresUrl(LlmProviderType.OPENAI_COMPATIBLE), true);
  assert.equal(LlmProviderPolicy.supportsUrlProtocol(LlmProviderType.OPENAI_COMPATIBLE, 'https:'), true);

  assert.equal(LlmProviderPolicy.requiresApiKey(LlmProviderType.CODEX_APP_SERVER), false);
  assert.equal(LlmProviderPolicy.requiresUrl(LlmProviderType.CODEX_APP_SERVER), true);
  assert.equal(LlmProviderPolicy.supportsUrlProtocol(LlmProviderType.CODEX_APP_SERVER, 'ws:'), true);
  assert.equal(LlmProviderPolicy.supportsUrlProtocol(LlmProviderType.CODEX_APP_SERVER, 'https:'), false);
  assert.equal(LlmProviderPolicy.getUrlExample(LlmProviderType.CODEX_APP_SERVER), 'ws://127.0.0.1:4500');
});
