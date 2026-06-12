import { Step } from 'sequential-workflow-model';
import { scriptDefinitionSchema } from './script-definition';
import z from 'zod/v4';
import { FormDefinition } from './form-definition';

// script step

export const scriptStepPropertiesSchema = z.object({
  script: scriptDefinitionSchema
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
    deadlineMinutes: number;
    stopProcessOnDeadline: boolean;
    form: FormDefinition;
  };
}
