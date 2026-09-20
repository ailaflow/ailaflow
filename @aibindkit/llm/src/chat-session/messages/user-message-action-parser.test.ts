import assert from 'node:assert/strict';
import test from 'node:test';
import { SystemMessage } from './system-message';
import { UserMessageAction, UserMessageActionParser } from './user-message-action-parser';
import { UserMessage } from './user-message';

test('parses the compact action when it is the only text', () => {
  for (const text of ['/compact', ' /compact ', '\n/compact\t']) {
    assert.equal(UserMessageActionParser.tryParse(new UserMessage(1, text)), UserMessageAction.COMPACT);
  }
});

test('does not parse the compact action when the text contains other characters', () => {
  for (const text of ['', 'compact', '/Compact', '/compact now', 'please /compact', '/compact/', '/compact\nmore']) {
    assert.equal(UserMessageActionParser.tryParse(new UserMessage(1, text)), null);
  }
});

test('does not parse actions from non-user messages', () => {
  assert.equal(UserMessageActionParser.tryParse(new SystemMessage(1, '/compact')), null);
});
