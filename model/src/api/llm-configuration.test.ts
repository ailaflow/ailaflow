import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmProviderType, LlmUseCase } from '../llm-configuration';
import { saveLlmProviderRequestSchema, saveLlmUseCaseAssignmentsRequestSchema } from './llm-configuration';

test('validates numeric provider enum and structural fields', () => {
  assert.equal(
    saveLlmProviderRequestSchema.safeParse({
      insert: true,
      id: 'provider',
      name: 'Gateway',
      type: LlmProviderType.OPENAI_COMPATIBLE,
      baseUrl: 'https://gateway.example/v1',
      apiKey: 'secret',
      models: ['model-a']
    }).success,
    true
  );
  assert.equal(
    saveLlmProviderRequestSchema.safeParse({
      insert: false,
      id: 'provider',
      name: 'OpenAI',
      type: LlmProviderType.OPENAI,
      baseUrl: null,
      models: []
    }).success,
    true
  );
});

test('validates numeric use-case enum without domain cross-field validation', () => {
  assert.equal(
    saveLlmUseCaseAssignmentsRequestSchema.safeParse({
      assignments: [{ useCase: LlmUseCase.ADMIN_CHAT, providerId: null, model: null }]
    }).success,
    true
  );
  assert.equal(
    saveLlmUseCaseAssignmentsRequestSchema.safeParse({
      assignments: [{ useCase: LlmUseCase.ADMIN_CHAT, providerId: 'provider', model: null }]
    }).success,
    true
  );
});
