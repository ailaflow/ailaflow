import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicUrlValidator } from './public-url-validator';

test('validates public URLs with domain, IP, port, and proxy path', () => {
  assert.equal(PublicUrlValidator.validate(null), null);
  assert.equal(PublicUrlValidator.validate('https://ailaflow.example.com'), null);
  assert.equal(PublicUrlValidator.validate('https://ailaflow.example.com/proxy/ailaflow'), null);
  assert.equal(PublicUrlValidator.validate('http://192.168.1.20:2048/ailaflow'), null);
});

test('rejects public URLs that cannot safely compose a health path', () => {
  assert.match(PublicUrlValidator.validate('')!, /required/);
  assert.match(PublicUrlValidator.validate('ailaflow.example.com')!, /invalid/);
  assert.match(PublicUrlValidator.validate('ftp://ailaflow.example.com')!, /HTTP or HTTPS/);
  assert.match(PublicUrlValidator.validate('https://user:secret@ailaflow.example.com')!, /credentials/);
  assert.match(PublicUrlValidator.validate('https://ailaflow.example.com?source=admin')!, /query/);
  assert.match(PublicUrlValidator.validate('https://ailaflow.example.com#status')!, /fragment/);
});

test('requires the expected URL format instead of silently normalizing input', () => {
  for (const value of [
    ' https://ailaflow.example.com',
    'https://ailaflow.example.com ',
    'https://ailaflow.example.com/',
    'https://ailaflow.example.com/proxy/ailaflow/',
    'https://AILAFLOW.example.com',
    'https://ailaflow.example.com:443',
    'https:ailaflow.example.com',
    'https://ailaflow.example.com/a/../b',
    'https://ailaflow.example.com/a b',
    'https://ailaflow.example.com?',
    'https://ailaflow.example.com#'
  ]) {
    assert.notEqual(PublicUrlValidator.validate(value), null, value);
  }
  assert.equal(PublicUrlValidator.validate('https://ailaflow.example.com/CaseSensitive/a%20b'), null);
});
