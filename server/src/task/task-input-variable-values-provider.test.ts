import assert from 'node:assert/strict';
import test from 'node:test';
import { TaskInputVariableValues } from './task-input-variable-values-provider';

test('task input variable values support null and return undefined for inaccessible variables', () => {
  const values = new TaskInputVariableValues(['nullable'], {
    nullable: null,
    inaccessible: 'secret'
  });

  assert.equal(values.tryGetOne('nullable'), null);
  assert.equal(values.tryGetOne('inaccessible'), undefined);
  assert.deepEqual(values.getAll(), { nullable: null });
});

test('task input variable values reject a missing execution value', () => {
  const values = new TaskInputVariableValues(['missing'], {});

  assert.throws(() => values.tryGetOne('missing'), /does not exist in the execution context/);
  assert.throws(() => values.getAll(), /does not exist in the execution context/);
});
