import assert from 'node:assert/strict';
import test from 'node:test';
import { BranchStep, NotificationStep } from '@ailaflow/shared';
import { createActivitySet, createAtomActivity, createWorkflowMachineBuilder } from 'sequential-workflow-machine';
import { Definition } from 'sequential-workflow-model';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';
import { branchActivity } from './branch-activity';

function createRecordStep(id: string): NotificationStep {
  return {
    id,
    type: 'notification',
    componentType: 'task',
    name: id,
    properties: {
      userExpression: { type: 'string', value: '' },
      notification: { type: 'string', value: '' }
    }
  };
}

test('branch activity executes the branch selected by a variable', async () => {
  const visitedStepIds: string[] = [];
  const activitySet = createActivitySet<ProcessExecutionGlobalState>([
    branchActivity,
    createAtomActivity<NotificationStep, ProcessExecutionGlobalState>('notification', {
      init: () => ({}),
      handler: async step => {
        visitedStepIds.push(step.id);
      }
    })
  ]);
  const branchStep: BranchStep = {
    id: 'branch',
    type: 'branch',
    componentType: 'switch',
    name: 'Branch',
    properties: {
      branchSelectorVariableName: 'route'
    },
    branches: {
      left: [createRecordStep('left')],
      right: [createRecordStep('right')]
    }
  };
  const definition: Definition = {
    sequence: [branchStep, createRecordStep('end')],
    properties: {}
  };
  const machine = createWorkflowMachineBuilder(activitySet).build(definition);
  const globalState = {
    variables: {
      get: () => 'right'
    }
  } as unknown as ProcessExecutionGlobalState;
  const interpreter = machine.create({
    init: () => globalState
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Branch activity did not finish')), 500);
    interpreter.onDone(() => {
      clearTimeout(timeout);
      resolve();
    });
    interpreter.start();
  });

  assert.deepEqual(visitedStepIds, ['right', 'end']);
  assert.equal(interpreter.getSnapshot().isFinished(), true);
});
