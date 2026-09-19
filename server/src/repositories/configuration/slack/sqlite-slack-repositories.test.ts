import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../../core/sqlite-databases';
import { SqliteUserRepository } from '../../user/sqlite-user-repository';
import { User } from '../../user/user';
import { SlackMappingRevisionConflictError, SlackMappingValidationError } from './slack-user-mapping-repository';
import { SlackInboundEventStatus } from './slack-types';
import { SqliteSlackConfigurationRepository } from './sqlite-slack-configuration-repository';
import { SqliteSlackInboundEventRepository } from './sqlite-slack-inbound-event-repository';
import { SqliteSlackUserDirectoryRepository } from './sqlite-slack-user-directory-repository';
import { SqliteSlackUserMappingRepository } from './sqlite-slack-user-mapping-repository';

test('persists Slack configuration, directory, atomic mappings, and inbound deduplication', async () => {
  const database = new DatabaseSync(':memory:', { open: true });
  database.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(database) } as SqliteDatabases;
  const users = new SqliteUserRepository(databases);
  const configuration = new SqliteSlackConfigurationRepository(databases);
  const directory = new SqliteSlackUserDirectoryRepository(databases);
  const mappings = new SqliteSlackUserMappingRepository(databases);
  const inbox = new SqliteSlackInboundEventRepository(databases);
  const signal = new AbortController().signal;
  await users.setup(signal);
  await configuration.setup(signal);
  await directory.setup(signal);
  await mappings.setup(signal);
  await inbox.setup(signal);
  await users.insert(signal, new User('alice', 'hash', true, false));
  await users.insert(signal, new User('bob', 'hash', true, false));
  await configuration.save(signal, {
    appToken: 'app-secret',
    botToken: 'bot-secret',
    appId: 'A1',
    workspaceId: 'T1',
    workspaceName: 'Test',
    botUserId: 'U_BOT',
    mappingRevision: 0,
    configuredAt: 1,
    updatedAt: 1
  });
  await directory.replaceFromRefresh(
    signal,
    'T1',
    [directoryUser('U1', 10), directoryUser('U2', 10), { ...directoryUser('B1', 10), isBot: true }],
    10
  );

  const firstRevision = await mappings.applyChanges(signal, 'T1', 0, [
    { slackUserId: 'U1', userName: 'alice' },
    { slackUserId: 'U2', userName: 'bob' }
  ]);
  assert.equal(firstRevision, 1);
  assert.equal((await mappings.tryGetByAilaUser(signal, 'alice', 'default'))?.slackUserId, 'U1');
  await assert.rejects(
    () => mappings.applyChanges(signal, 'T1', 0, [{ slackUserId: 'U1', userName: null }]),
    SlackMappingRevisionConflictError
  );
  assert.equal((await mappings.getAll(signal, 'T1')).length, 2);

  await assert.rejects(
    () =>
      mappings.applyChanges(signal, 'T1', 1, [
        { slackUserId: 'U1', userName: 'bob' },
        { slackUserId: 'U2', userName: 'alice' }
      ]),
    SlackMappingValidationError
  );
  assert.equal((await mappings.tryGetByAilaUser(signal, 'alice', 'default'))?.slackUserId, 'U1');
  assert.equal((await mappings.tryGetBySlackUser(signal, 'T1', 'U2'))?.generation, 1);

  await directory.replaceFromRefresh(signal, 'T1', [directoryUser('U1', 20)], 20);
  assert.equal((await directory.tryGet(signal, 'T1', 'U2'))?.isDeleted, true);
  assert.equal((await mappings.getAll(signal, 'T1')).length, 2);
  assert.deepEqual(await directory.getCounts(signal, 'T1'), { active: 1, unavailable: 1, lastRefreshedAt: 20 });

  const event = {
    eventId: 'Ev1',
    workspaceId: 'T1',
    slackUserId: 'U1',
    slackChannelId: 'D1',
    slackMessageTs: '1.0',
    text: 'Hello',
    eventPayload: '{}',
    status: SlackInboundEventStatus.PENDING,
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
    receivedAt: 30,
    processedAt: null
  };
  assert.equal(await inbox.tryInsert(signal, event), true);
  assert.equal(await inbox.tryInsert(signal, event), false);
  assert.equal((await inbox.getPending(signal, 30, 10)).length, 1);
  await inbox.markProcessed(signal, event.eventId, 31);
  assert.equal((await inbox.getPending(signal, 31, 10)).length, 0);

  assert.equal((await configuration.tryGet(signal))?.botToken, 'bot-secret');
  assert.equal(await configuration.delete(signal), true);
  assert.equal(await configuration.tryGet(signal), null);
  assert.equal((await mappings.getAll(signal, 'T1')).length, 2);
  database.close();
});

function directoryUser(slackUserId: string, time: number) {
  return {
    workspaceId: 'T1',
    slackUserId,
    legacyName: slackUserId.toLowerCase(),
    displayName: slackUserId,
    realName: null,
    email: `${slackUserId.toLowerCase()}@example.com`,
    isDeleted: false,
    isBot: false,
    isAppUser: false,
    lastSeenAt: time,
    updatedAt: time
  };
}
