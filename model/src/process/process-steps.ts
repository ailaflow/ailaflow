import { Step } from 'sequential-workflow-model';
import { scriptSchema } from '../script/script';
import z from 'zod/v4';

// script step

export const scriptStepPropertiesSchema = z.object({
  script: scriptSchema
});

export type ScriptStepProperties = z.infer<typeof scriptStepPropertiesSchema>;

export interface ScriptStep extends Step {
  type: 'script';
  properties: ScriptStepProperties;
}

// agent step

export interface AgentStep extends Step {
  type: 'agent';
  properties: {
    prompt: string;
  };
}

// notification step

export interface NotificationStep extends Step {
  type: 'notification';
  properties: {
    userList: string;
  };
}

// task step

export interface TaskStep extends Step {
  type: 'task';
  properties: {
    user: string;
    outputVariableNames: string[];
    deadlineMinutes: number;
    stopProcessOnDeadline: boolean;
    form?: object;
  };
}
