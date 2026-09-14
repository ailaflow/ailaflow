import assert from 'node:assert/strict';
import test from 'node:test';
import { AsyncMutex } from './async-mutex';

test('async mutex grants access to one caller at a time in acquisition order', async () => {
  const mutex = new AsyncMutex();
  const order: string[] = [];

  const releaseFirst = await mutex.acquire();

  const second = mutex.acquire().then(release => {
    order.push('second');
    release();
    release();
  });
  const third = mutex.acquire().then(release => {
    order.push('third');
    release();
  });

  await Promise.resolve();
  assert.deepEqual(order, []);

  releaseFirst();
  releaseFirst();
  await Promise.all([second, third]);

  assert.deepEqual(order, ['second', 'third']);
});
