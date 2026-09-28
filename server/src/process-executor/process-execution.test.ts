import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessExecutionOutcomeType, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { createActivitySet, createSignalActivity, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Definition, Step } from 'sequential-workflow-model';
import { ProcessExecution } from './process-execution';
import { ProcessExecutor } from './process-executor';
import { ProcessExecutionGlobalState } from './process-execution-global-state';
import { ProcessLogger } from './services/process-logger';
import { ProcessVariableManager } from './services/process-variable-manager';
import { Process } from '../repositories/process/process';
import { ProcessExecutionPersister } from './process-execution-persister';
import { ProcessVariables } from '../repositories/process/process-variables';
import { ProcessVariableEvaluator } from './services/process-value-evaluator';
import { Notifier } from '../notification/notifier';
import { ProcessExecutionTrigger } from './process-execution-context';
import { EventBus } from '../events/event-bus';

const context = {
  trigger: ProcessExecutionTrigger.ENDPOINT,
  startedBy: 'user_1',
  isTest: false
};

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
  const stopController = new AbortController();
  const $logger = new ProcessLogger();
  const $variables = new ProcessVariableManager({} as ProcessExecutionVariableValues, new ProcessVariables([], []));
  const interpreter = machine.create({
    init: () =>
      new ProcessExecutionGlobalState(
        stopController.signal,
        'execution_1',
        context,
        {} as Process,
        $logger,
        $variables,
        new ProcessVariableEvaluator($variables),
        {} as ProcessExecutionGlobalState['scriptExecutor'],
        {} as ProcessExecutionGlobalState['taskCreator'],
        {} as Notifier,
        {} as ProcessExecutionGlobalState['agentSessionRunner']
      )
  });

  const pausedStepId = await new Promise<string | null>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Execution did not pause')), 250);
    const execution = new ProcessExecution(
      'execution_1',
      context,
      false,
      stopController,
      {} as Process,
      interpreter,
      $logger,
      $variables,
      new EventBus(),
      {
        persist: async () => {
          clearTimeout(timeout);
          resolve(interpreter.getSnapshot().tryGetCurrentStepId());
        }
      } as unknown as ProcessExecutionPersister,
      {} as ProcessExecutor
    );

    execution.run({});
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
  const stopController = new AbortController();
  const $logger = new ProcessLogger();
  const $variables = new ProcessVariableManager({} as ProcessExecutionVariableValues, new ProcessVariables([], []));
  const interpreter = machine.create({
    init: () =>
      new ProcessExecutionGlobalState(
        stopController.signal,
        'execution_1',
        context,
        {} as Process,
        $logger,
        $variables,
        new ProcessVariableEvaluator($variables),
        {} as ProcessExecutionGlobalState['scriptExecutor'],
        {} as ProcessExecutionGlobalState['taskCreator'],
        {} as Notifier,
        {} as ProcessExecutionGlobalState['agentSessionRunner']
      )
  });

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Execution did not fail')), 250);
    const execution = new ProcessExecution(
      'execution_1',
      context,
      false,
      stopController,
      {} as Process,
      interpreter,
      $logger,
      $variables,
      new EventBus(),
      {
        persist: async () => {
          throw new Error('Storage unavailable');
        }
      } as unknown as ProcessExecutionPersister,
      {} as ProcessExecutor
    );

    execution.onOutcome.subscribe(value => {
      clearTimeout(timeout);
      resolve(value);
    });
    execution.run();
  });

  assert.deepEqual(result, {
    type: ProcessExecutionOutcomeType.FAILED,
    error: 'Could not persist paused execution: Storage unavailable',
    stepId: 'task_1'
  });
});
