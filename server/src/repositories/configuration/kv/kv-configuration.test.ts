import assert from 'node:assert/strict';
import test from 'node:test';
import { KvConfiguration } from './kv-configuration';

test('tracks setter calls and preserves validated URLs', () => {
  const configuration = new KvConfiguration('https://ailaflow.example.com');
  assert.deepEqual(configuration.getChangedKeys(), []);
  configuration.setPublicUrl('https://ailaflow.example.com/app');
  assert.equal(configuration.publicUrl, 'https://ailaflow.example.com/app');
  assert.deepEqual(configuration.getChangedKeys(), ['publicUrl']);
  configuration.setPublicUrl('https://ailaflow.example.com');
  assert.deepEqual(configuration.getChangedKeys(), ['publicUrl', 'publicUrl']);
  assert.throws(() => configuration.setPublicUrl('invalid-url'));
  assert.throws(() => configuration.setPublicUrl(' https://ailaflow.example.com '), /whitespace/);
  assert.throws(() => configuration.setPublicUrl('https://ailaflow.example.com/'), /slash/);
  assert.throws(() => configuration.setPublicUrl('https://ailaflow.example.com?invalid=true'), /query/);
  assert.equal(configuration.publicUrl, 'https://ailaflow.example.com');
  configuration.setPublicUrl(null);
  assert.equal(configuration.publicUrl, null);
});

test('clones preserve pending changes and keep properties independent', () => {
  const configuration = new KvConfiguration();
  configuration.setPublicUrl('https://ailaflow.example.com');
  const copy = configuration.clone();
  assert.deepEqual(copy.getChangedKeys(), ['publicUrl']);
  copy.setPublicUrl(null);
  assert.equal(configuration.publicUrl, 'https://ailaflow.example.com');
  assert.equal(copy.publicUrl, null);
  assert.deepEqual(configuration.getChangedKeys(), ['publicUrl']);
});
