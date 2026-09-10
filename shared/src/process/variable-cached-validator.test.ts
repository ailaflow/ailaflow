import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessDefinition } from './process-definition';
import { PROCESS_VERSION } from './process-version';
import { VariableCachedValidator } from './variable-cached-validator';

test('recompiles a variable schema after the schema object is replaced', () => {
  const definition: ProcessDefinition = {
    sequence: [],
    properties: {
      startVariableNames: ['value'],
      variables: [
        {
          name: 'value',
          description: '',
          schema: { type: 'string' }
        }
      ],
      version: PROCESS_VERSION
    }
  };
  const validator = new VariableCachedValidator();

  assert.equal(validator.validateVariableValue('value', 'text', definition), null);
  assert.notEqual(validator.validateVariableValue('value', 42, definition), null);

  definition.properties.variables[0].schema = { type: 'number' };

  assert.equal(validator.validateVariableValue('value', 42, definition), null);
  assert.notEqual(validator.validateVariableValue('value', 'text', definition), null);
});
