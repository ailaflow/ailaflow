import assert from 'node:assert/strict';
import test from 'node:test';
import { HealthEndpoint } from './health-endpoint';

test('exposes an unauthenticated Aila health response', async () => {
  const endpoint = new HealthEndpoint();
  assert.equal(endpoint.method, 'get');
  assert.equal(endpoint.path, '/health');
  assert.equal('auth' in endpoint, false);
  assert.equal('admin' in endpoint, false);
  assert.deepEqual(await endpoint.handle(), { server: 'aila', status: 'ok' });
});
