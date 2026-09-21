import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { ResourceAccess } from '../resource-access/resource-access-repository';
import { SqliteResourceAccessRepository } from '../resource-access/sqlite-resource-access-repository';
import { ProcessResourceId } from './process-resource-id';
import { SqliteProcessRepository } from './sqlite-process-repository';
import { Process } from './process';
import { ProcessDefinition, ProcessDisplay, ProcessExecutionMode, PROCESS_VERSION } from '@ailaflow/shared';

test('persists and updates process metadata', async () => {
  const { abortSignal, db, processRepository } = await setup();
  const process = createProcess('alpha', true);

  await processRepository.insert(abortSignal, process);
  assert.equal((await processRepository.tryGetByName(abortSignal, process.name))?.isPausable, true);
  assert.equal((await processRepository.tryGetByName(abortSignal, process.name))?.display, ProcessDisplay.LISTED);
  assert.equal(
    (await processRepository.tryGetByName(abortSignal, process.name))?.executionMode,
    ProcessExecutionMode.AI_TOOL_OR_START_FORM
  );

  process.isPausable = false;
  process.display = ProcessDisplay.FEATURED;
  process.executionMode = ProcessExecutionMode.START_FORM;
  await processRepository.update(abortSignal, process);
  assert.equal((await processRepository.tryGetByName(abortSignal, process.name))?.isPausable, false);
  assert.equal((await processRepository.tryGetByName(abortSignal, process.name))?.display, ProcessDisplay.FEATURED);
  assert.equal((await processRepository.tryGetByName(abortSignal, process.name))?.executionMode, ProcessExecutionMode.START_FORM);

  db.close();
});

test('adds executionMode to an existing processes table', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`
    CREATE TABLE processes (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      userAccessExpression TEXT NOT NULL,
      display INTEGER NOT NULL,
      nSteps INTEGER NOT NULL,
      isPausable INTEGER NOT NULL DEFAULT 0 CHECK (isPausable IN (0, 1)),
      startVariableSchemas TEXT NOT NULL,
      serializedDefinition TEXT NOT NULL,
      definitionHash TEXT NOT NULL
    ) STRICT
  `);
  insertProcess(db, 'alpha');

  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const processRepository = new SqliteProcessRepository(dbs);
  const abortSignal = new AbortController().signal;
  await processRepository.setup(abortSignal);

  assert.equal((await processRepository.tryGetByName(abortSignal, 'alpha'))?.executionMode, ProcessExecutionMode.AI_TOOL_OR_START_FORM);
  db.close();
});

test('deletes a process and its resource access rules', async () => {
  const { abortSignal, db, processRepository, resourceAccessRepository } = await setup();
  insertProcess(db, 'alpha');
  insertProcess(db, 'bravo');
  await grantAccess(abortSignal, resourceAccessRepository, 'alpha');
  await grantAccess(abortSignal, resourceAccessRepository, 'bravo');

  assert.equal(await processRepository.delete(abortSignal, 'alpha'), true);
  assert.equal(await processRepository.tryGetByName(abortSignal, 'alpha'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:alpha'), 0);
  assert.equal(countRows(db, 'resource_access_rule_conditions', 'process:alpha'), 0);
  assert.notEqual(await processRepository.tryGetByName(abortSignal, 'bravo'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:bravo'), 1);
  assert.equal(await processRepository.delete(abortSignal, 'missing'), false);

  db.close();
});

test('rolls back access-rule deletion when process deletion fails', async () => {
  const { abortSignal, db, processRepository, resourceAccessRepository } = await setup();
  insertProcess(db, 'alpha');
  await grantAccess(abortSignal, resourceAccessRepository, 'alpha');
  db.exec(`
    CREATE TRIGGER prevent_process_delete
    BEFORE DELETE ON processes
    BEGIN
      SELECT RAISE(ABORT, 'delete blocked');
    END
  `);

  await assert.rejects(() => processRepository.delete(abortSignal, 'alpha'), /delete blocked/);
  assert.notEqual(await processRepository.tryGetByName(abortSignal, 'alpha'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:alpha'), 1);
  assert.equal(countRows(db, 'resource_access_rule_conditions', 'process:alpha'), 1);

  db.close();
});

async function setup() {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const resourceAccessRepository = new SqliteResourceAccessRepository(dbs);
  await processRepository.setup(abortSignal);
  await resourceAccessRepository.setup(abortSignal);
  return { abortSignal, db, processRepository, resourceAccessRepository };
}

function insertProcess(db: DatabaseSync, name: string): void {
  db.prepare(
    `
      INSERT INTO processes (
        name,
        description,
        userAccessExpression,
        display,
        nSteps,
        startVariableSchemas,
        serializedDefinition,
        definitionHash
      )
      VALUES (?, '', '', 1, 0, '{}', '{"sequence":[],"properties":{"startVariableNames":[],"variables":[]}}', 'hash')
    `
  ).run(name);
}

function createProcess(name: string, isPausable: boolean): Process {
  return new Process(
    name,
    '',
    '',
    ProcessDisplay.LISTED,
    ProcessExecutionMode.AI_TOOL_OR_START_FORM,
    createDefinition(),
    'hash',
    null,
    0,
    isPausable
  );
}

function createDefinition(): ProcessDefinition {
  return {
    sequence: [],
    properties: {
      startVariableNames: [],
      variables: [],
      version: PROCESS_VERSION
    }
  };
}

async function grantAccess(abortSignal: AbortSignal, repository: SqliteResourceAccessRepository, processName: string): Promise<void> {
  await repository.replace(abortSignal, ResourceAccess.createFromAccessExpression(ProcessResourceId.create(processName), ''));
}

function countRows(db: DatabaseSync, table: string, resourceId: string): number {
  const statement = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE resource_id = ?`);
  return (statement.get(resourceId) as { count: number }).count;
}
