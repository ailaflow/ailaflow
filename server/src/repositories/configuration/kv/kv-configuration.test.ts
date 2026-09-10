import assert from 'node:assert/strict';
import test from 'node:test';
import { LicenseType } from '@ailaflow/shared';
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

test('tracks license type and key changes without persisting status', () => {
  const configuration = new KvConfiguration(null, null, LicenseType.BUSINESS, 'old-key');
  configuration.setLicenseType(LicenseType.BUSINESS, 'new-key');
  assert.equal(configuration.licenseKey, 'new-key');
  assert.deepEqual(configuration.getChangedKeys(), ['licenseType', 'licenseKey']);
  configuration.setLicenseType(LicenseType.HOME, null);
  assert.equal(configuration.licenseKey, null);
  assert.equal('lastLicenseStatus' in configuration, false);
});

test('clones preserve pending changes and keep properties independent', () => {
  const configuration = new KvConfiguration(null, 'instance-id', LicenseType.BUSINESS, 'key');
  configuration.setPublicUrl('https://ailaflow.example.com');
  const copy = configuration.clone();
  assert.equal(copy.instanceId, 'instance-id');
  copy.setInstanceId('another-instance-id');
  assert.equal(configuration.instanceId, 'instance-id');
  assert.deepEqual(copy.getChangedKeys(), ['publicUrl', 'instanceId']);
  copy.setPublicUrl(null);
  copy.getChangedKeys().push('licenseKey');
  assert.equal(configuration.publicUrl, 'https://ailaflow.example.com');
  assert.equal(copy.publicUrl, null);
  assert.deepEqual(configuration.getChangedKeys(), ['publicUrl']);
});
