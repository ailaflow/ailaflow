import { createActivitySet } from 'sequential-workflow-machine';
import { scriptStepActivity } from './script-activity';
import { returnActivity } from './return-activity';
import { taskStepActivity } from './task-activity';

export const activitySet = createActivitySet([scriptStepActivity, returnActivity, taskStepActivity]);
