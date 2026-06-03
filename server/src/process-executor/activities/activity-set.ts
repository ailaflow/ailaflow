import { createActivitySet } from 'sequential-workflow-machine';
import { scriptStepActivity } from './script-activity';

export const activitySet = createActivitySet([scriptStepActivity]);
