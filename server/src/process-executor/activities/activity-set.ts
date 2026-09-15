import { createActivitySet } from 'sequential-workflow-machine';
import { scriptStepActivity } from './script-activity';
import { returnActivity } from './return-activity';
import { taskStepActivity } from './task-activity';
import { notificationStepActivity } from './notification-activity';
import { agentStepActivity } from './agent-activity';
import { branchActivity } from './branch-activity';

export const activitySet = createActivitySet([
  scriptStepActivity,
  agentStepActivity,
  returnActivity,
  notificationStepActivity,
  taskStepActivity,
  branchActivity
]);
