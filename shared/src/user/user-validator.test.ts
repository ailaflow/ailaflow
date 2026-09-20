import assert from 'node:assert/strict';
import test from 'node:test';
import { UserValidator } from './user-validator';

test('validates optional email addresses', () => {
  assert.equal(UserValidator.validateEmail(null), null);
  assert.equal(UserValidator.validateEmail('alice@example.com'), null);
  assert.equal(UserValidator.validateEmail('alice'), 'Invalid email');
});

test('requires passwords to contain at least six characters', () => {
  assert.equal(UserValidator.validatePassword('secret'), null);
  assert.equal(UserValidator.validatePassword('short'), 'Password must be at least 6 characters long');
});
