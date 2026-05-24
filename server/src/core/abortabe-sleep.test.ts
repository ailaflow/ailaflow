import assert from 'node:assert/strict';
import test from 'node:test';
import { abortableSleep } from './abortable-sleep';

test('abortable sleep', async () => {
  const start = Date.now();

  try {
    await abortableSleep(AbortSignal.timeout(200), 5_000);
    throw new Error('Expected to throw');
  } catch (e) {
    assert.equal((e as Error).name, 'AbortError');
  }

  const elapsed = Date.now() - start;

  assert.ok(elapsed < 210 && elapsed > 190);
});
