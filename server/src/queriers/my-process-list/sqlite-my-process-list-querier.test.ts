import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessResourceId } from '../../repositories/process/process-resource-id';
import { SqliteProcessRepository } from '../../repositories/process/sqlite-process-repository';
import { ResourceAccess } from '../../repositories/resource-access/resource-access-repository';
import { SqliteResourceAccessRepository } from '../../repositories/resource-access/sqlite-resource-access-repository';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { SqliteUserAttributesRepository } from '../../repositories/user-attributes/sqlite-user-attributes-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteMyProcessListQuerier } from './sqlite-my-process-list-querier';
import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';

test('queries a page containing only processes accessible to the current user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const userRepository = new SqliteUserRepository(dbs);
  const userAttributesRepository = new SqliteUserAttributesRepository(dbs);
  const resourceAccessRepository = new SqliteResourceAccessRepository(dbs);
  const querier = new SqliteMyProcessListQuerier(dbs);

  await processRepository.setup(signal);
  await userRepository.setup(signal);
  await userAttributesRepository.setup(signal);
  await resourceAccessRepository.setup(signal);

  const alice = new User('alice', null, 'hash', true, false);
  await userRepository.insert(signal, alice);
  await userAttributesRepository.replace(signal, UserAttributes.create(alice, {}));

  insertProcess(db, 'charlie', ProcessDisplay.HIDDEN);
  insertProcess(db, 'alpha', ProcessDisplay.FEATURED);
  insertProcess(db, 'bravo', ProcessDisplay.LISTED, ProcessExecutionMode.START_FORM);
  await grantAccess(signal, resourceAccessRepository, 'alpha', '');
  await grantAccess(signal, resourceAccessRepository, 'bravo', '');
  await grantAccess(signal, resourceAccessRepository, 'charlie', '');

  assert.deepEqual(await querier.query(signal, 'alice', 2, 1, ProcessDisplay.LISTED), {
    processes: [
      {
        name: 'bravo',
        description: 'bravo description',
        executionMode: ProcessExecutionMode.START_FORM
      }
    ],
    totalCount: 2,
    page: 2,
    pageSize: 1
  });
  assert.deepEqual(await querier.query(signal, 'alice', 1, 10, ProcessDisplay.FEATURED), {
    processes: [
      {
        name: 'alpha',
        description: 'alpha description',
        executionMode: ProcessExecutionMode.AI_TOOL_OR_START_FORM
      }
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10
  });
  assert.equal((await querier.query(signal, 'alice', 1, 10, ProcessDisplay.HIDDEN)).totalCount, 3);

  db.close();
});

function insertProcess(
  db: DatabaseSync,
  name: string,
  display: ProcessDisplay,
  executionMode = ProcessExecutionMode.AI_TOOL_OR_START_FORM
): void {
  db.prepare(
    `
    INSERT INTO processes (
      name,
      description,
      userAccessExpression,
      display,
      executionMode,
      nSteps,
      startVariableSchemas,
      serializedDefinition,
      definitionHash
    )
    VALUES (?, ?, '', ?, ?, 0, '{}', '{}', 'hash')
  `
  ).run(name, `${name} description`, display, executionMode);
}

async function grantAccess(
  signal: AbortSignal,
  repository: SqliteResourceAccessRepository,
  processName: string,
  userAccessExpression: string
): Promise<void> {
  await repository.replace(signal, ResourceAccess.createFromAccessExpression(ProcessResourceId.create(processName), userAccessExpression));
}
