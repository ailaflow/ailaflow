import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ResourceAccess } from '../resource-access/resource-access-repository';
import { SqliteResourceAccessRepository } from '../resource-access/sqlite-resource-access-repository';
import { ProcessResourceId } from './process-resource-id';
import { SqliteProcessRepository } from './sqlite-process-repository';
import { Process } from './process';
import { ProcessDefinition, ProcessDisplay, ProcessExecutionMode, PROCESS_VERSION } from '@ailaflow/shared';

test('persists and updates process metadata', async () => {
  const { signal, db, processRepository } = await setup();
  const process = createProcess('alpha', 2);
  process.icon = '<svg viewBox="0 0 10 10"></svg>';
  process.sandboxNames = ['node', 'python'];
  process.updatedAt = 1000;

  await processRepository.insert(signal, process);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.nTasksSteps, 2);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.display, ProcessDisplay.LISTED);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.executionMode, ProcessExecutionMode.AI_TOOL_OR_START_FORM);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.icon, process.icon);
  assert.deepEqual((await processRepository.tryGetByName(signal, process.name))?.sandboxNames, ['node', 'python']);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.updatedAt, 1000);
  assert.deepEqual(getStoredDefinitionMetadata(db, process.name), {
    definitionSize: JSON.stringify(process.definition).length,
    nReturnSteps: 0,
    nTasksSteps: 2
  });

  process.nTasksSteps = 0;
  process.display = ProcessDisplay.FEATURED;
  process.executionMode = ProcessExecutionMode.START_FORM;
  process.icon = null;
  process.definition = createDefinitionWithReturnStep();
  process.nSteps = 1;
  process.nReturnSteps = 1;
  process.sandboxNames = ['bun'];
  process.updatedAt = 2000;
  await processRepository.update(signal, process);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.nTasksSteps, 0);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.display, ProcessDisplay.FEATURED);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.executionMode, ProcessExecutionMode.START_FORM);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.icon, null);
  assert.deepEqual((await processRepository.tryGetByName(signal, process.name))?.sandboxNames, ['bun']);
  assert.equal((await processRepository.tryGetByName(signal, process.name))?.updatedAt, 2000);
  assert.deepEqual(getStoredDefinitionMetadata(db, process.name), {
    definitionSize: JSON.stringify(process.definition).length,
    nReturnSteps: 1,
    nTasksSteps: 0
  });

  db.close();
});

test('adds empty sandbox names without rewriting existing definitions', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const sqliteDatabase = new SqliteDatabase(db);
  db.exec(`
    CREATE TABLE processes (
      name TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      userAccessExpression TEXT NOT NULL,
      display INTEGER NOT NULL,
      executionMode INTEGER NOT NULL,
      icon TEXT,
      nSteps INTEGER NOT NULL,
      nReturnSteps INTEGER NOT NULL,
      nTasksSteps INTEGER NOT NULL,
      startVariableSchemas TEXT NOT NULL,
      definition TEXT NOT NULL,
      definitionSize INTEGER NOT NULL,
      definitionHash TEXT NOT NULL
    ) STRICT
  `);
  db.prepare(`INSERT INTO _version (tableName, version) VALUES ('processes', 1)`).run();
  insertProcess(db, 'alpha');
  const definitionBeforeSetup = getStoredDefinition(db, 'alpha');
  const repository = new SqliteProcessRepository({ modelDb: sqliteDatabase } as SqliteDatabases);

  await repository.setup(new AbortController().signal);

  assert.deepEqual((await repository.tryGetByName(new AbortController().signal, 'alpha'))?.sandboxNames, []);
  assert.equal((await repository.tryGetByName(new AbortController().signal, 'alpha'))?.updatedAt, 0);
  assert.equal(getStoredDefinition(db, 'alpha'), definitionBeforeSetup);
  db.close();
});

test('deletes a process and its resource access rules', async () => {
  const { signal, db, processRepository, resourceAccessRepository } = await setup();
  insertProcess(db, 'alpha');
  insertProcess(db, 'bravo');
  await grantAccess(signal, resourceAccessRepository, 'alpha');
  await grantAccess(signal, resourceAccessRepository, 'bravo');

  assert.equal(await processRepository.delete(signal, 'alpha'), true);
  assert.equal(await processRepository.tryGetByName(signal, 'alpha'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:alpha'), 0);
  assert.equal(countRows(db, 'resource_access_rule_conditions', 'process:alpha'), 0);
  assert.notEqual(await processRepository.tryGetByName(signal, 'bravo'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:bravo'), 1);
  assert.equal(await processRepository.delete(signal, 'missing'), false);

  db.close();
});

test('rolls back access-rule deletion when process deletion fails', async () => {
  const { signal, db, processRepository, resourceAccessRepository } = await setup();
  insertProcess(db, 'alpha');
  await grantAccess(signal, resourceAccessRepository, 'alpha');
  db.exec(`
    CREATE TRIGGER prevent_process_delete
    BEFORE DELETE ON processes
    BEGIN
      SELECT RAISE(ABORT, 'delete blocked');
    END
  `);

  await assert.rejects(() => processRepository.delete(signal, 'alpha'), /delete blocked/);
  assert.notEqual(await processRepository.tryGetByName(signal, 'alpha'), null);
  assert.equal(countRows(db, 'resource_access_rule_groups', 'process:alpha'), 1);
  assert.equal(countRows(db, 'resource_access_rule_conditions', 'process:alpha'), 1);

  db.close();
});

async function setup() {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const processRepository = new SqliteProcessRepository(dbs);
  const resourceAccessRepository = new SqliteResourceAccessRepository(dbs);
  await processRepository.setup(signal);
  await resourceAccessRepository.setup(signal);
  return { signal, db, processRepository, resourceAccessRepository };
}

function insertProcess(db: DatabaseSync, name: string): void {
  db.prepare(
    `
      INSERT INTO processes (
        name,
        description,
        userAccessExpression,
        display,
        executionMode,
        nSteps,
        nReturnSteps,
        nTasksSteps,
        startVariableSchemas,
        definition,
        definitionSize,
        definitionHash
      )
      VALUES (?, '', '', 1, 0, 0, 0, 0, '{}', '{"sequence":[],"properties":{"startVariableNames":[],"variables":[]}}', 69, 'hash')
    `
  ).run(name);
}

function createProcess(name: string, nTasksSteps: number): Process {
  return new Process(
    name,
    '',
    '',
    ProcessDisplay.LISTED,
    ProcessExecutionMode.AI_TOOL_OR_START_FORM,
    null,
    createDefinition(),
    'hash',
    null,
    0,
    0,
    nTasksSteps,
    [],
    0
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

function createDefinitionWithReturnStep(): ProcessDefinition {
  return {
    sequence: [
      {
        id: 'return',
        name: 'Żółw',
        type: 'return',
        componentType: 'interruptingTask',
        properties: { outputVariableNames: [] }
      }
    ],
    properties: {
      startVariableNames: [],
      variables: [],
      version: PROCESS_VERSION
    }
  };
}

async function grantAccess(signal: AbortSignal, repository: SqliteResourceAccessRepository, processName: string): Promise<void> {
  await repository.replace(signal, ResourceAccess.createFromAccessExpression(ProcessResourceId.create(processName), ''));
}

function countRows(db: DatabaseSync, table: string, resourceId: string): number {
  const statement = db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE resource_id = ?`);
  return (statement.get(resourceId) as { count: number }).count;
}

function getStoredDefinitionMetadata(
  db: DatabaseSync,
  name: string
): { definitionSize: number; nReturnSteps: number; nTasksSteps: number } {
  const row = db.prepare(`SELECT definitionSize, nReturnSteps, nTasksSteps FROM processes WHERE name = ?`).get(name) as {
    definitionSize: number;
    nReturnSteps: number;
    nTasksSteps: number;
  };
  return {
    definitionSize: row.definitionSize,
    nReturnSteps: row.nReturnSteps,
    nTasksSteps: row.nTasksSteps
  };
}

function getStoredDefinition(db: DatabaseSync, name: string): string {
  return (db.prepare(`SELECT definition FROM processes WHERE name = ?`).get(name) as { definition: string }).definition;
}
