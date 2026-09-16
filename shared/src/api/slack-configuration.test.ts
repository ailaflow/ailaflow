import assert from 'node:assert/strict';
import test from 'node:test';
import { getSlackUsersRequestSchema, saveSlackConfigurationRequestSchema, saveSlackMappingsRequestSchema } from './slack-configuration';

test('validates Slack credential and pagination requests', () => {
  assert.equal(saveSlackConfigurationRequestSchema.safeParse({ appToken: 'xapp-value', botToken: 'xoxb-value' }).success, true);
  assert.equal(saveSlackConfigurationRequestSchema.safeParse({ botToken: 'xoxb-value' }).success, true);
  assert.equal(saveSlackConfigurationRequestSchema.safeParse({}).success, false);
  assert.equal(saveSlackConfigurationRequestSchema.safeParse({ appToken: ' ' }).success, false);
  assert.equal(getSlackUsersRequestSchema.safeParse({ page: '1', pageSize: '50', search: 'alice' }).success, true);
  assert.equal(getSlackUsersRequestSchema.safeParse({ page: 0, pageSize: 50 }).success, false);
  assert.equal(getSlackUsersRequestSchema.safeParse({ page: 1, pageSize: 101 }).success, false);
});

test('rejects duplicate Slack mapping changes', () => {
  assert.equal(
    saveSlackMappingsRequestSchema.safeParse({
      expectedRevision: 1,
      changes: [
        { slackUserId: 'U1', userName: 'alice' },
        { slackUserId: 'U1', userName: 'bob' }
      ]
    }).success,
    false
  );
  assert.equal(
    saveSlackMappingsRequestSchema.safeParse({
      expectedRevision: 1,
      changes: [
        { slackUserId: 'U1', userName: 'alice' },
        { slackUserId: 'U2', userName: 'alice' }
      ]
    }).success,
    false
  );
});
