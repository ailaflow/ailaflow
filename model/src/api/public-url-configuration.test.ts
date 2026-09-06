import assert from 'node:assert/strict';
import test from 'node:test';
import { savePublicUrlConfigurationRequestSchema, testPublicUrlRequestSchema } from './public-url-configuration';

test('validates Public URL API requests with the shared validator', () => {
  assert.equal(savePublicUrlConfigurationRequestSchema.safeParse({ publicUrl: null }).success, true);
  assert.equal(savePublicUrlConfigurationRequestSchema.safeParse({ publicUrl: 'https://aila.example.com/proxy/aila' }).success, true);
  assert.equal(testPublicUrlRequestSchema.safeParse({}).success, true);
  assert.equal(testPublicUrlRequestSchema.safeParse({ publicUrl: null }).success, true);
  assert.equal(testPublicUrlRequestSchema.safeParse({ publicUrl: 'http://127.0.0.1:2048' }).success, true);
  assert.equal(testPublicUrlRequestSchema.safeParse({ publicUrl: 'aila.example.com' }).success, false);
  assert.equal(testPublicUrlRequestSchema.safeParse({ publicUrl: 'https://aila.example.com?invalid=true' }).success, false);
  for (const publicUrl of [' https://aila.example.com ', 'https://aila.example.com/', 'https://AILA.example.com']) {
    assert.equal(savePublicUrlConfigurationRequestSchema.safeParse({ publicUrl }).success, false);
    assert.equal(testPublicUrlRequestSchema.safeParse({ publicUrl }).success, false);
  }
});
