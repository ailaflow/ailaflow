import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessExecutionVariableValues } from '@aila/model';
import { createActivitySet, createSignalActivity, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Definition, Step } from 'sequential-workflow-model';
import { ProcessExecution } from './process-execution';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessLogger } from './services/process-logger';
import { ProcessVariableManager } from './services/process-variable-manager';
import { Process } from '../repositories/process/process';
import { ProcessExecutionPersister } from './process-execution-persister';
import { ProcessVariables } from '../repositories/process/process-variables';
import { Notifier } from './services/notifier';
import { ProcessVariableEvaluator } from './services/process-value-evaluator';

test('process execution signals the first wait and pauses on a later wait', async () => {
  const activitySet = createActivitySet<ProcessExecutionGlobalState>([
    createSignalActivity<Step, ProcessExecutionGlobalState>('task', {
      init: () => ({}),
      beforeSignal: async () => undefined,
      afterSignal: async () => undefined
    })
  ]);
  const definition: Definition = {
    sequence: [
      {
        id: 'task_1',
        componentType: 'task',
        type: 'task',
        name: 'Task 1',
        properties: {}
      },
      {
        id: 'task_2',
        componentType: 'task',
        type: 'task',
        name: 'Task 2',
        properties: {}
      }
    ],
    properties: {}
  };
  const machine = createWorkflowMachineBuilder(activitySet).build(definition);
  const $logger = new ProcessLogger();
  const $variables = new ProcessVariableManager({} as ProcessExecutionVariableValues, new ProcessVariables([], []));
  const interpreter = machine.create({
    init: () =>
      new ProcessExecutionGlobalState(
        'execution_1',
        $logger,
        $variables,
        new ProcessVariableEvaluator($variables),
        {} as ProcessExecutionGlobalState['scriptExecutor'],
        {} as ProcessExecutionGlobalState['taskManager'],
        {} as Notifier
      )
  });

  const pausedStepId = await new Promise<string | null>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Execution did not pause')), 250);
    const execution = new ProcessExecution('execution_1', { startedBy: 'user_1' }, {} as Process, interpreter, $logger, $variables, {
      persist: async () => {
        clearTimeout(timeout);
        resolve(interpreter.getSnapshot().tryGetCurrentStepId());
      }
    } as unknown as ProcessExecutionPersister);

    execution.run(new AbortController().signal, {
      signalOnFirstWait: {}
    });
  });

  assert.equal(pausedStepId, 'task_2');
});

test('process execution fails when pause persistence fails', async () => {
  const machine = createWorkflowMachineBuilder(
    createActivitySet<ProcessExecutionGlobalState>([
      createSignalActivity<Step, ProcessExecutionGlobalState>('task', {
        init: () => ({}),
        beforeSignal: async () => undefined,
        afterSignal: async () => undefined
      })
    ])
  ).build({
    sequence: [
      {
        id: 'task_1',
        componentType: 'task',
        type: 'task',
        name: 'Task 1',
        properties: {}
      }
    ],
    properties: {}
  });
  const $logger = new ProcessLogger();
  const $variables = new ProcessVariableManager({} as ProcessExecutionVariableValues, new ProcessVariables([], []));
  const interpreter = machine.create({
    init: () =>
      new ProcessExecutionGlobalState(
        'execution_1',
        $logger,
        $variables,
        new ProcessVariableEvaluator($variables),
        {} as ProcessExecutionGlobalState['scriptExecutor'],
        {} as ProcessExecutionGlobalState['taskManager'],
        {} as Notifier
      )
  });

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Execution did not fail')), 250);
    const execution = new ProcessExecution('execution_1', { startedBy: 'user_1' }, {} as Process, interpreter, $logger, $variables, {
      persist: async () => {
        throw new Error('Storage unavailable');
      }
    } as unknown as ProcessExecutionPersister);

    execution.onFinished.subscribe(value => {
      clearTimeout(timeout);
      resolve(value);
    });
    execution.run(new AbortController().signal);
  });

  assert.deepEqual(result, {
    success: false,
    error: 'Could not persist paused execution: Storage unavailable',
    stepId: 'task_1'
  });
});
