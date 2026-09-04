import { PROCESS_VERSION } from '@aila/model';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Request } from 'express';
import test from 'node:test';
import { ProcessDefinitionUpgrader } from '../../process/process-definition-upgrader';
import { ProcessManager } from '../../process/process-manager';
import { ProcessCronJob } from '../../repositories/process-cron-job/process-cron-job';
import { ProcessCronJobRepository } from '../../repositories/process-cron-job/process-cron-job-repository';
import { ProcessRepository } from '../../repositories/process/process-repository';
import { Process } from '../../repositories/process/process';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteProcessCronJobEndpoint } from './delete-process-cron-job-endpoint';
import { GetProcessCronJobsEndpoint } from './get-process-cron-jobs-endpoint';
import { SaveProcessCronJobEndpoint } from './save-process-cron-job-endpoint';

test('creates, lists, updates, and deletes a process cron job', async () => {
  const repository = new MemoryProcessCronJobRepository();
  const processManager = createProcessManager();
  const saveEndpoint = new SaveProcessCronJobEndpoint(processManager, repository);
  const getEndpoint = new GetProcessCronJobsEndpoint(processManager, repository);
  const deleteEndpoint = new DeleteProcessCronJobEndpoint(repository);

  const created = await saveEndpoint.handle(
    createRequest(
      { processName: 'alpha' },
      { insert: true, processName: 'alpha', expression: '0 9 * * *', timeZone: 'UTC', inputValues: { x: 1 }, isEnabled: true }
    )
  );
  const listed = await getEndpoint.handle(createRequest({ processName: 'alpha' }));
  assert.equal(listed.jobs.length, 1);
  assert.equal(listed.jobs[0].id, created.id);

  await saveEndpoint.handle(
    createRequest(
      {},
      {
        insert: false,
        id: created.id,
        processName: 'alpha',
        expression: '0 10 * * *',
        timeZone: 'UTC',
        inputValues: { x: 2 },
        isEnabled: false
      }
    )
  );
  assert.equal((await repository.tryGet(new AbortController().signal, created.id))?.expression, '0 10 * * *');
  assert.deepEqual(await deleteEndpoint.handle(createRequest({ id: created.id })), { id: created.id });
});

test('rejects cron jobs with input that does not match the process definition', async () => {
  const endpoint = new SaveProcessCronJobEndpoint(createProcessManager(), new MemoryProcessCronJobRepository());
  await assert.rejects(
    () =>
      endpoint.handle(
        createRequest(
          {},
          { insert: true, processName: 'alpha', expression: '0 9 * * *', timeZone: 'UTC', inputValues: { x: 'wrong' }, isEnabled: true }
        )
      ),
    error => error instanceof EndpointError && error.status === 400 && error.message.includes('$x')
  );
});

function createProcessManager(): ProcessManager {
  const process = new Process(
    'alpha',
    '',
    '',
    {
      sequence: [],
      properties: {
        version: PROCESS_VERSION,
        startVariableNames: ['x'],
        variables: [{ name: 'x', description: '', schema: { type: 'integer' } }]
      }
    },
    'hash',
    { x: { type: 'integer' } },
    0,
    false
  );
  const repository = {
    setup: async () => undefined,
    insert: async () => undefined,
    update: async () => undefined,
    delete: async () => false,
    tryGetByName: async (_: AbortSignal, name: string) => (name === process.name ? process : null)
  } satisfies ProcessRepository;
  return new ProcessManager(repository, new ProcessDefinitionUpgrader());
}

function createRequest(params: Record<string, string>, body?: unknown): Request {
  return Object.assign(new EventEmitter(), { params, body }) as unknown as Request;
}

class MemoryProcessCronJobRepository implements ProcessCronJobRepository {
  private readonly jobs = new Map<string, ProcessCronJob>();

  public async setup(): Promise<void> {}
  public async insert(_: AbortSignal, job: ProcessCronJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
  public async updateConfiguration(_: AbortSignal, job: ProcessCronJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
  public async updateLastRun(): Promise<boolean> {
    return false;
  }
  public async delete(_: AbortSignal, id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }
  public async tryGet(_: AbortSignal, id: string): Promise<ProcessCronJob | null> {
    return this.jobs.get(id) ?? null;
  }
  public async getByProcessName(_: AbortSignal, processName: string): Promise<ProcessCronJob[]> {
    return [...this.jobs.values()].filter(job => job.processName === processName);
  }
  public async getDue(): Promise<ProcessCronJob[]> {
    return [];
  }
  public async tryAdvanceNextExecutionAt(): Promise<boolean> {
    return false;
  }
}
