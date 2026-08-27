import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { ProcessRepository } from '../../repositories/process/process-repository';
import { DeleteProcessEndpoint } from './delete-process-endpoint';
import { EndpointError } from '../framework/endpoint-error';
import { ProcessManager } from '../../process/process-manager';
import { ProcessDefinitionUpgrader } from '../../process/process-definition-upgrader';

test('deletes a process by route name', async () => {
  let deletedName: string | null = null;
  const endpoint = new DeleteProcessEndpoint(
    createManager(async name => {
      deletedName = name;
      return true;
    })
  );

  assert.deepEqual(await endpoint.handle(createRequest('alpha')), { name: 'alpha' });
  assert.equal(deletedName, 'alpha');
});

test('returns not found when the process does not exist', async () => {
  const endpoint = new DeleteProcessEndpoint(createManager(async () => false));

  await assert.rejects(
    () => endpoint.handle(createRequest('missing')),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Process not found'
  );
});

function createManager(deleteProcess: (name: string) => Promise<boolean>): ProcessManager {
  const repository: ProcessRepository = {
    setup: async () => undefined,
    insert: async () => undefined,
    update: async () => undefined,
    delete: async (_, name) => deleteProcess(name),
    tryGetByName: async () => null
  };
  return new ProcessManager(repository, new ProcessDefinitionUpgrader());
}

function createRequest(name: string): Request {
  return Object.assign(new EventEmitter(), { params: { name } }) as unknown as Request;
}
