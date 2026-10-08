import assert from 'node:assert/strict';
import test from 'node:test';
import { SlackBotApiClient, SlackBotApiError } from './slack-bot-api-client';

test('uses authorization headers and parses Slack API operations', async t => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; authorization: string | null; body: unknown }> = [];
  const responses = [
    { ok: true, app_id: 'A1', team_id: 'T1', team: 'Workspace', user_id: 'U_BOT' },
    { ok: true, url: 'wss://example.invalid/socket' },
    { ok: true, members: [{ id: 'U1' }], response_metadata: { next_cursor: 'next' } },
    { ok: true, members: [{ id: 'U2' }], response_metadata: { next_cursor: '' } },
    { ok: true, channel: 'D1', ts: '1.2' }
  ];
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get('Authorization'),
      body: JSON.parse(String(init?.body)) as unknown
    });
    return Response.json(responses.shift());
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const client = new SlackBotApiClient('https://slack.test/api');
  const signal = new AbortController().signal;
  assert.deepEqual(await client.testAuth(signal, 'bot-secret'), {
    appId: 'A1',
    workspaceId: 'T1',
    workspaceName: 'Workspace',
    botUserId: 'U_BOT'
  });
  assert.equal((await client.openSocketConnection(signal, 'app-secret')).url, 'wss://example.invalid/socket');
  assert.deepEqual(
    (await client.listUsers(signal, 'bot-secret')).map(user => user.id),
    ['U1', 'U2']
  );
  assert.deepEqual(await client.postMessage(signal, 'bot-secret', 'D1', { text: 'Hello' }), { channel: 'D1', ts: '1.2' });
  assert.equal(calls[0].authorization, 'Bearer bot-secret');
  assert.equal(calls[1].authorization, 'Bearer app-secret');
  assert.deepEqual(calls[4].body, { channel: 'D1', text: 'Hello', mrkdwn: false, unfurl_links: false, unfurl_media: false });
});

test('turns ok false and rate limiting responses into sanitized typed errors', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: false, error: 'ratelimited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '7' }
    });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    () => new SlackBotApiClient().postMessage(new AbortController().signal, 'xoxb-do-not-leak', 'D1', { text: 'Hello' }),
    error => {
      assert.equal(error instanceof SlackBotApiError, true);
      assert.equal((error as SlackBotApiError).retryAfterSeconds, 7);
      assert.equal((error as Error).message.includes('xoxb-do-not-leak'), false);
      return true;
    }
  );
});
