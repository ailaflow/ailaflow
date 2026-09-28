import assert from 'node:assert/strict';
import test from 'node:test';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { Process } from '../repositories/process/process';
import { SandboxInstanceManager } from '../sandbox/sandbox-instance-manager';
import { TaskCreator } from '../task/task-creator';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessLogger } from './services/process-logger';
import { ProcessScriptExecutor } from './services/process-script-executor';
import { ProcessExecutionSnapshotTransformer } from './process-execution-snapshot-transformer';
import { AgentSessionRunner } from './services/agent-session-runner';
import { ProcessExecutionContext } from './process-execution-context';
import { PROCESS_VERSION, ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';
import { Notifier } from '../notification/notifier';

const context: ProcessExecutionContext = {
  startedBy: 'user_1',
  isTest: true
};
const stopSignal = new AbortController().signal;

test('process execution global state serializes variables and recreates runtime services', () => {
  const process = createTestProcess();
  const state = createGlobalState(process, {
    answer: 123
  });

  const serialized = state.serialize();

  assert.deepEqual(serialized, {
    variableValues: {
      answer: 123
    }
  });

  const deserialized = ProcessExecutionGlobalState.deserialize(stopSignal, 'execution_1', context, serialized, process, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskCreator: {} as TaskCreator,
    notifier: {} as Notifier,
    agentSessionRunner: {} as AgentSessionRunner
  });

  assert.equal(deserialized.process, process);
  assert.equal(deserialized.executionId, 'execution_1');
  assert.equal(deserialized.context, context);
  assert.equal(deserialized.stopSignal, stopSignal);
  assert.equal(deserialized.variables.get('answer'), 123);
  assert.equal(deserialized.logger instanceof ProcessLogger, true);
  assert.equal(deserialized.scriptExecutor instanceof ProcessScriptExecutor, true);
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
    variableValues: {
      answer: 123
    }
  });
  assert.equal((serialized as { history?: unknown }).history, undefined);

  const deserialized = ProcessExecutionSnapshotTransformer.deserialize(stopSignal, 'execution_1', context, process, serialized, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskCreator: {} as TaskCreator,
    notifier: {} as Notifier,
    agentSessionRunner: {} as AgentSessionRunner
  });

  assert.equal(deserialized.context.globalState.process, process);
  assert.equal(deserialized.context.globalState.stopSignal, stopSignal);
  assert.equal(deserialized.context.globalState.variables.get('answer'), 123);
  assert.equal(deserialized.context.globalState.logger instanceof ProcessLogger, true);
});

function createTestProcess(): Process {
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
        variables: [
          {
            name: 'answer',
            description: '',
            schema: {
              type: 'number'
            }
          }
        ],
        version: PROCESS_VERSION
      }
    },
    'process_hash',
    null,
    0,
    0,
    0
  );
}

function createGlobalState(process: Process, values: Record<string, unknown>): ProcessExecutionGlobalState {
  return ProcessExecutionGlobalState.create(stopSignal, 'execution_1', context, values, process, {
    sandboxInstanceManager: {} as SandboxInstanceManager,
    taskCreator: {} as TaskCreator,
    notifier: {} as Notifier,
    agentSessionRunner: {} as AgentSessionRunner
  });
}
