import assert from 'node:assert/strict';
import test from 'node:test';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { Process } from '../repositories/process/process';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { TaskManager } from './services/task-manager';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { Notifier } from './services/notifier';

test('process execution global state serializes variables and recreates runtime services', () => {
  const process = createTestProcess();
  const state = createGlobalState(process, {
    answer: 123
  });

  const serialized = state.serialize();

  assert.deepEqual(serialized, {
    executionId: 'execution_1',
    variableValues: {
      answer: 123
    }
  });

  const deserialized = ProcessExecutionGlobalState.deserialize(serialized, process, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskManager: {} as TaskManager,
    notifier: {} as Notifier
  });

  assert.equal(deserialized.executionId, 'execution_1');
  assert.equal(deserialized.$variables.get('answer'), 123);
  assert.equal(deserialized.$logger instanceof ProcessLogger, true);
  assert.equal(deserialized.$scriptExecutor instanceof ProcessScriptExecutor, true);
});

test('process execution snapshot transformer converts current and history global state', () => {
  const process = createTestProcess();
  const state = createGlobalState(process, {
    answer: 123
  });
  const snapshot = {
    value: { MAIN: { STEP_task_1: 'WAIT_FOR_SIGNAL' } },
    context: {
      globalState: state,
      activityStates: {}
    },
    history: {
      context: {
        globalState: state,
        activityStates: {}
      }
    }
  } as unknown as SerializedWorkflowMachineSnapshot<ProcessExecutionGlobalState>;

  const serialized = ProcessExecutionSnapshotTransformer.serialize(snapshot);

  assert.deepEqual(serialized.context.globalState, {
    executionId: 'execution_1',
    variableValues: {
      answer: 123
    }
  });
  assert.equal((serialized as { history?: unknown }).history, undefined);

  const deserialized = ProcessExecutionSnapshotTransformer.deserialize(serialized, process, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskManager: {} as TaskManager,
    notifier: {} as Notifier
  });

  assert.equal(deserialized.context.globalState.$variables.get('answer'), 123);
  assert.equal(deserialized.context.globalState.$logger instanceof ProcessLogger, true);
});

function createTestProcess(): Process {
  return new Process(
    'process_1',
    '',
    '',
    {
      sequence: [],
      properties: {
        startVariableNames: [],
        variables: [
          {
            name: 'answer',
            description: '',
            schema: {
              schema: {
                type: 'number'
              },
              hash: 'schema_hash'
            }
          }
        ]
      }
    },
    'process_hash',
    null,
    0
  );
}

function createGlobalState(process: Process, values: Record<string, unknown>): ProcessExecutionGlobalState {
  return ProcessExecutionGlobalState.create('execution_1', values, process, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskManager: {} as TaskManager,
    notifier: {} as Notifier
  });
}
