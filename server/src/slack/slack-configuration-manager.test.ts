import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../core/sqlite-databases';
import { EventBus } from '../events/event-bus';
import { SqliteSlackConfigurationRepository } from '../repositories/configuration/slack/sqlite-slack-configuration-repository';
import { SqliteSlackUserDirectoryRepository } from '../repositories/configuration/slack/sqlite-slack-user-directory-repository';
import { SqliteSlackUserMappingRepository } from '../repositories/configuration/slack/sqlite-slack-user-mapping-repository';
import { SqliteUserRepository } from '../repositories/user/sqlite-user-repository';
import { User } from '../repositories/user/user';
import { SlackBotApiClient } from './slack-bot-api-client';
import { SlackConfigurationManager } from './slack-configuration-manager';

test('disconnect removes mappings and configuration but preserves the cached Slack directory', async () => {
  const database = new DatabaseSync(':memory:', { open: true });
  database.exec(`PRAGMA foreign_keys = ON`);
  const databases = { modelDb: new SqliteDatabase(database) } as SqliteDatabases;
  const users = new SqliteUserRepository(databases);
  const configuration = new SqliteSlackConfigurationRepository(databases);
  const directory = new SqliteSlackUserDirectoryRepository(databases);
  const mappings = new SqliteSlackUserMappingRepository(databases);
  const signal = new AbortController().signal;
  await users.setup(signal);
  await configuration.setup(signal);
  await directory.setup(signal);
  await mappings.setup(signal);
  await users.insert(signal, new User('alice', 'hash', true, false));
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
    [
      {
        workspaceId: 'T1',
        slackUserId: 'U1',
        legacyName: 'alice-slack',
        displayName: 'Alice Slack',
        realName: null,
        email: 'alice@example.com',
        isDeleted: false,
        isBot: false,
        isAppUser: false,
        lastSeenAt: 10,
        updatedAt: 10
      }
    ],
    10
  );
  await mappings.applyChanges(signal, 'T1', 0, [{ slackUserId: 'U1', userName: 'alice' }]);
  const manager = new SlackConfigurationManager(
    configuration,
    directory,
    mappings,
    new SlackBotApiClient(),
    { getHealth: () => ({ isOperational: false, isConnected: false, lastError: null }) },
    new EventBus()
  );

  assert.deepEqual(await manager.delete(signal), { success: true });
  assert.equal(await configuration.tryGet(signal), null);
  assert.equal((await mappings.getAll(signal, 'T1')).length, 0);
  assert.equal((await directory.tryGet(signal, 'T1', 'U1'))?.displayName, 'Alice Slack');

  database.close();
});
