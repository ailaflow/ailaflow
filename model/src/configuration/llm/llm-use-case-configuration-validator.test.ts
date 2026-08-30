import assert from 'node:assert/strict';
import test from 'node:test';
import { LlmUseCaseConfigurationValidator } from './llm-use-case-configuration-validator';

test('validates LLM use-case configuration fields', () => {
  assert.equal(LlmUseCaseConfigurationValidator.validateProviderAndModel('provider', 'model'), null);
  assert.match(LlmUseCaseConfigurationValidator.validateProviderAndModel('provider', null)!, /both be set or both be null/);
  assert.equal(LlmUseCaseConfigurationValidator.validateProviderId('provider'), null);
  assert.match(LlmUseCaseConfigurationValidator.validateProviderId('')!, /required/);
  assert.equal(LlmUseCaseConfigurationValidator.validateModelName('model '), null);
  assert.match(LlmUseCaseConfigurationValidator.validateModelName(' ')!, /required/);
  assert.equal(LlmUseCaseConfigurationValidator.validateModelContextWindow(undefined), null);
  assert.equal(LlmUseCaseConfigurationValidator.validateModelContextWindow(131_072), null);
  assert.match(LlmUseCaseConfigurationValidator.validateModelContextWindow(0)!, /positive integer/);
  assert.equal(LlmUseCaseConfigurationValidator.validateEffectiveContextWindowPercent(95), null);
  assert.match(LlmUseCaseConfigurationValidator.validateEffectiveContextWindowPercent(101)!, /between 1 and 100/);
});
