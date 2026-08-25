import assert from 'node:assert/strict';
import test from 'node:test';
import { Process } from '../repositories/process/process';
import { ProcessRepository } from '../repositories/process/process-repository';
import { PersistedExecution } from '../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { ProcessExecutionResumeError, ProcessExecutionResumer } from './process-execution-resumer';
import { ProcessExecutor } from './process-executor';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionResumeListenerStore } from './process-execution-resume-listener-store';

test('process execution resumer fails when the process hash changed', async () => {
  const abortSignal = new AbortController().signal;
  const resumer = new ProcessExecutionResumer(
    {
      setup: async () => undefined,
      insert: async () => undefined,
      update: async () => undefined,
      delete: async () => false,
      tryGetByName: async () => createTestProcess('new_hash')
    } as ProcessRepository,
    {
      setup: async () => undefined,
      upsert: async () => undefined,
      delete: async () => undefined,
      tryGet: async () =>
        new PersistedExecution(
          'execution_1',
          { startedBy: 'user_1', isTest: false },
          'process_1',
          'old_hash',
          {
            value: { MAIN: { STEP_task_1: 'WAIT_FOR_SIGNAL' } },
            context: {
              globalState: {
                variableValues: {}
              },
              activityStates: {}
            }
          } as never,
          1000,
          2000
        )
    } as PersistedExecutionRepository,
    {} as ProcessExecutor,
    new ProcessExecutionResumeListenerStore(),
    new EventBus()
  );

  await assert.rejects(() => resumer.resume(abortSignal, 'execution_1', {}), ProcessExecutionResumeError);
});

function createTestProcess(hash: string): Process {
  return new Process(
    'process_1',
    '',
    '',
    {
      sequence: [],
      properties: {
        startVariableNames: [],
        variables: []
      }
    },
    hash,
    null,
    0
  );
}
