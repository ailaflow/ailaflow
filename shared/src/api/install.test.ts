import assert from 'node:assert/strict';
import test from 'node:test';
import { installRequestSchema } from './install';

test('accepts installation credentials without licensing fields', () => {
  const request = { rootUserName: 'root', rootPassword: 'password' };
  assert.deepEqual(installRequestSchema.parse(request), request);
});
