import { createActivitySet } from 'sequential-workflow-machine';
import { scriptStepActivity } from './script-activity';
import { returnActivity } from './return-activity';

export const activitySet = createActivitySet([scriptStepActivity, returnActivity]);
