import assert from 'node:assert/strict';
import test from 'node:test';
import { CodexLlmClient } from '@aibindkit/llm';
import { LlmProviderType } from '@ailaflow/model';
import { LlmProviderConfiguration } from '../repositories/configuration/llm/llm-provider-configuration';
import { LlmClientFactory } from './llm-client-factory';

test('creates a Codex app-server client without an API key', () => {
  const provider = LlmProviderConfiguration.create({
    name: 'Local Codex',
    type: LlmProviderType.CODEX_APP_SERVER,
    url: 'ws://127.0.0.1:4500',
    apiKey: null,
    models: []
  });
  const client = new LlmClientFactory().createForProvider(provider);
  try {
    assert.ok(client instanceof CodexLlmClient);
  } finally {
    client.dispose();
  }
});
