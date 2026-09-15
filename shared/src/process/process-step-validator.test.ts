import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessDefinition } from './process-definition';
import { ProcessStepValidator } from './process-step-validator';
import { BranchStep } from './process-steps';
import { VariableCachedValidator } from './variable-cached-validator';

function createDefinition(variableType: string): ProcessDefinition {
  return {
    sequence: [],
    properties: {
      startVariableNames: [],
      variables: [
        {
          name: 'route',
          description: '',
          schema: { type: variableType }
        }
      ],
      version: 1
    }
  };
}

function createBranchStep(branchSelectorVariableName: string): BranchStep {
  return {
    id: 'branch',
    type: 'branch',
    componentType: 'switch',
    name: 'Branch',
    properties: {
      branchSelectorVariableName
    },
    branches: {
      default: []
    }
  };
}

test('branch step requires an existing string selector variable', () => {
  const validator = new ProcessStepValidator([], new VariableCachedValidator());

  assert.deepEqual(validator.validate(createBranchStep('route'), createDefinition('string')), {});
  assert.equal(
    validator.validate(createBranchStep('route'), createDefinition('number'))['properties.branchSelectorVariableName'],
    'Variable $route must be of type string'
  );
  assert.equal(
    validator.validate(createBranchStep('missing'), createDefinition('string'))['properties.branchSelectorVariableName'],
    'Variable $missing does not exist'
  );
});
