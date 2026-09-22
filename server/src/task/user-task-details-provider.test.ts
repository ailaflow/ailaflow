import assert from 'node:assert/strict';
import test from 'node:test';
import { TaskDetails } from './user-task-details-provider';

test('task details expose only declared input variable values and the output schemas', () => {
  const outputVariableSchemas = {
    approved: { type: 'boolean' as const }
  };
  const details = new TaskDetails(
    'test',
    ['nullable'],
    {
      nullable: null,
      inaccessible: 'secret'
    },
    outputVariableSchemas
  );

  assert.equal(details.tryGetInputVariableValue('nullable'), null);
  assert.equal(details.tryGetInputVariableValue('inaccessible'), undefined);
  assert.deepEqual(details.getAllInputVariableValues(), { nullable: null });
  assert.equal(details.outputVariableSchemas, outputVariableSchemas);
});

test('task details reject a missing declared input variable value', () => {
  const details = new TaskDetails('test', ['missing'], {}, null);

  assert.throws(() => details.tryGetInputVariableValue('missing'), /does not exist in the execution context/);
  assert.throws(() => details.getAllInputVariableValues(), /does not exist in the execution context/);
});
