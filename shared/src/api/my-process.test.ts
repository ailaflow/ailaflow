import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessDisplay } from '../process';
import { getMyProcessesRequestSchema } from './my-process';

test('parses process display thresholds from query parameters', () => {
  assert.equal(
    getMyProcessesRequestSchema.parse({ page: '1', pageSize: '20', displayAtLeast: '0' }).displayAtLeast,
    ProcessDisplay.FEATURED
  );
  assert.equal(getMyProcessesRequestSchema.parse({ page: '1', pageSize: '20', displayAtLeast: '1' }).displayAtLeast, ProcessDisplay.LISTED);
  assert.equal(getMyProcessesRequestSchema.parse({ page: '1', pageSize: '20', displayAtLeast: '2' }).displayAtLeast, ProcessDisplay.HIDDEN);
  assert.equal(getMyProcessesRequestSchema.safeParse({ page: '1', pageSize: '20', displayAtLeast: '3' }).success, false);
});
