import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicUrlValidator } from './public-url-validator';

test('validates public URLs with domain, IP, port, and proxy path', () => {
  assert.equal(PublicUrlValidator.validate(null), null);
  assert.equal(PublicUrlValidator.validate('https://aila.example.com'), null);
  assert.equal(PublicUrlValidator.validate('https://aila.example.com/proxy/aila/'), null);
  assert.equal(PublicUrlValidator.validate('http://192.168.1.20:2048/aila'), null);
});

test('rejects public URLs that cannot safely compose a health path', () => {
  assert.match(PublicUrlValidator.validate('')!, /required/);
  assert.match(PublicUrlValidator.validate('aila.example.com')!, /invalid/);
  assert.match(PublicUrlValidator.validate('ftp://aila.example.com')!, /HTTP or HTTPS/);
  assert.match(PublicUrlValidator.validate('https://user:secret@aila.example.com')!, /credentials/);
  assert.match(PublicUrlValidator.validate('https://aila.example.com?source=admin')!, /query/);
  assert.match(PublicUrlValidator.validate('https://aila.example.com#status')!, /fragment/);
});
