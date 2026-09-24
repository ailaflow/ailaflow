import assert from 'node:assert/strict';
import test from 'node:test';
import { sha256 } from './sha256';

test('hashes an empty string', () => {
  assert.equal(sha256(''), '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU');
});

test('hashes a token', () => {
  assert.equal(sha256('auth-token'), '2yL0YYIInq0TGnTCyaUwQhXpxtIktdzWH7QIx9mmMWU');
});
