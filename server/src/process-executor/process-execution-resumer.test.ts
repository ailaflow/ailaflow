import assert from 'node:assert/strict';
import test from 'node:test';
import { Process } from '../repositories/process/process';
import { ProcessRepository } from '../repositories/process/process-repository';
import { PersistedExecution } from '../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../repositories/persisted-execution/persisted-execution-repository';
import { ProcessExecutionResumer } from './process-execution-resumer';
import { ProcessExecutor } from './process-executor';
import { ProcessExecution } from './process-execution';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionResumeListenerStore } from './process-execution-resume-listener-store';
import { ProcessManager } from '../process/process-manager';
import { ProcessDefinitionUpgrader } from '../process/process-definition-upgrader';
import { PROCESS_VERSION, ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';

test('process execution resumer continues when the process hash changed', async () => {
  const signal = new AbortController().signal;
  let deletedExecutionId: string | null = null;
  let runPayload: unknown;
  const execution = {
    context: { startedBy: 'user_1', isTest: false },
    onOutcome: { subscribe: () => undefined },
    run: (payload: unknown) => {
      runPayload = payload;
    }
  } as unknown as ProcessExecution;
  const resumer = new ProcessExecutionResumer(
    new ProcessManager(
      {
        setup: async () => undefined,
        insert: async () => undefined,
        update: async () => undefined,
        delete: async () => false,
        tryGetByName: async () => createTestProcess('new_hash')
      } as ProcessRepository,
      new ProcessDefinitionUpgrader()
    ),
    {
      setup: async () => undefined,
      upsert: async () => undefined,
      delete: async (_abortSignal, executionId) => {
        deletedExecutionId = executionId;
      },
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
    { restore: () => execution } as unknown as ProcessExecutor,
    new ProcessExecutionResumeListenerStore(),
    new EventBus()
  );

  const payload = { signal: 'continue' };
  assert.equal(await resumer.resume(signal, 'execution_1', payload), execution);
  assert.equal(deletedExecutionId, 'execution_1');
  assert.equal(runPayload, payload);
});

function createTestProcess(hash: string): Process {
  return new Process(
    'process_1',
    '',
    '',
    ProcessDisplay.LISTED,
    ProcessExecutionMode.AI_TOOL_OR_START_FORM,
    null,
    {
      sequence: [],
      properties: {
        startVariableNames: [],
        variables: [],
        version: PROCESS_VERSION
      }
    },
    hash,
    null,
    0,
    0,
    0,
    []
  );
}
