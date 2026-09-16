import { SlackWelcomeStatus } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteSlackConfigurationRepository } from '../../repositories/configuration/slack/sqlite-slack-configuration-repository';
import { SqliteSlackUserDirectoryRepository } from '../../repositories/configuration/slack/sqlite-slack-user-directory-repository';
import { SqliteSlackUserMappingRepository } from '../../repositories/configuration/slack/sqlite-slack-user-mapping-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteSlackUserListQuerier } from './sqlite-slack-user-list-querier';

test('queries Slack user DTOs with mappings, filtering, and literal search', async () => {
  const database = new DatabaseSync(':memory:', { open: true });
  database.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(database) } as SqliteDatabases;
  const users = new SqliteUserRepository(databases);
  const configuration = new SqliteSlackConfigurationRepository(databases);
  const directory = new SqliteSlackUserDirectoryRepository(databases);
  const mappings = new SqliteSlackUserMappingRepository(databases);
  const querier = new SqliteSlackUserListQuerier(databases);
  const signal = new AbortController().signal;
  await users.setup(signal);
  await configuration.setup(signal);
  await directory.setup(signal);
  await mappings.setup(signal);
  await users.insert(signal, new User('alice', 'hash', false));
  await configuration.save(signal, {
    appToken: 'app-secret',
    botToken: 'bot-secret',
    appId: 'A1',
    workspaceId: 'T1',
    workspaceName: 'Test',
    botUserId: 'B1',
    mappingRevision: 0,
    configuredAt: 1,
    updatedAt: 1
  });
  await directory.replaceFromRefresh(
    signal,
    'T1',
    [directoryUser('U1', 'Alice Slack'), directoryUser('U2', 'Bob Slack'), { ...directoryUser('B1', 'Bot'), isBot: true }],
    10
  );
  await mappings.applyChanges(signal, 'T1', 0, [{ slackUserId: 'U1', userName: 'alice' }]);

  const page = await querier.query(signal, 'T1', 1, 10);
  assert.equal(page.totalCount, 2);
  assert.equal(page.mappingRevision, 1);
  assert.deepEqual(page.users[0], {
    slackUserId: 'U1',
    legacyName: 'u1',
    displayName: 'Alice Slack',
    realName: null,
    email: 'u1@example.com',
    isDeleted: false,
    userName: 'alice',
    mappingGeneration: 1,
    mappingUpdatedAt: page.users[0]?.mappingUpdatedAt,
    welcomeStatus: SlackWelcomeStatus.PENDING,
    welcomeLastError: null
  });
  assert.equal(typeof page.users[0]?.mappingUpdatedAt, 'number');
  assert.equal((await querier.query(signal, 'T1', 1, 10, 'Bob')).users[0]?.slackUserId, 'U2');
  assert.equal((await querier.query(signal, 'T1', 1, 10, '%')).totalCount, 0);

  database.close();
});

function directoryUser(slackUserId: string, displayName: string) {
  return {
    workspaceId: 'T1',
    slackUserId,
    legacyName: slackUserId.toLowerCase(),
    displayName,
    realName: null,
    email: `${slackUserId.toLowerCase()}@example.com`,
    isDeleted: false,
    isBot: false,
    isAppUser: false,
    lastSeenAt: 10,
    updatedAt: 10
  };
}
