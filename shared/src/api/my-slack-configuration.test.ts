import assert from 'node:assert/strict';
import test from 'node:test';
import { mySlackConfigurationResponseSchema, SlackConnectionStatus } from './my-slack-configuration';

test('validates the three user Slack connection states', () => {
  for (const status of [SlackConnectionStatus.CONNECTED, SlackConnectionStatus.UNAVAILABLE, SlackConnectionStatus.NOT_CONNECTED]) {
    assert.equal(
      mySlackConfigurationResponseSchema.safeParse({ status, workspaceName: null, displayName: null, email: null }).success,
      true
    );
  }
  assert.equal(
    mySlackConfigurationResponseSchema.safeParse({ status: 'invalid', workspaceName: null, displayName: null, email: null }).success,
    false
  );
});
