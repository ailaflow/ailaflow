import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmProviderType, LlmUseCase } from '../configuration/llm';
import { saveLlmProviderRequestSchema, saveLlmUseCaseAssignmentsRequestSchema } from './llm-configuration';

test('validates numeric provider enum and structural fields', () => {
  assert.equal(
    saveLlmProviderRequestSchema.safeParse({
      insert: true,
      id: 'provider',
      name: 'Gateway',
      type: LlmProviderType.OPENAI_COMPATIBLE,
      url: 'https://gateway.example/v1',
      apiKey: 'secret',
      models: [{ name: 'model-a', contextWindow: 131_072 }]
    }).success,
    true
  );
  assert.equal(
    saveLlmProviderRequestSchema.safeParse({
      insert: false,
      id: 'provider',
      name: 'OpenAI',
      type: LlmProviderType.OPENAI,
      url: null,
      apiKey: null,
      models: [{ name: 'model-a' }]
    }).success,
    true
  );
});

test('rejects saving providers without models for both creation and updates', () => {
  for (const insert of [true, false]) {
    const result = saveLlmProviderRequestSchema.safeParse({
      insert,
      id: 'provider',
      name: 'OpenAI',
      type: LlmProviderType.OPENAI,
      url: null,
      apiKey: 'secret',
      models: []
    });
    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues.map(issue => issue.path), [['models']]);
  }
});

test('validates numeric use-case enum without domain cross-field validation', () => {
  assert.equal(
    saveLlmUseCaseAssignmentsRequestSchema.safeParse({
      assignments: [
        {
          useCase: LlmUseCase.ADMIN_CHAT,
          providerId: null,
          modelName: null,
          effectiveContextWindowPercent: 95
        }
      ]
    }).success,
    true
  );
  assert.equal(
    saveLlmUseCaseAssignmentsRequestSchema.safeParse({
      assignments: [
        {
          useCase: LlmUseCase.AGENT_STEP,
          providerId: 'provider',
          modelName: null,
          effectiveContextWindowPercent: 95
        }
      ]
    }).success,
    true
  );
});
