import assert from 'node:assert/strict';
import test from 'node:test';
import * as model from './index';

test('exports model API', () => {
  assert.ok(Object.keys(model).length > 1);
});
