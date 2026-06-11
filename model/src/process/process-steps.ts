import { Step } from 'sequential-workflow-model';
import { Script } from '../script/script';

export interface ScriptFileContent {
  mimeType: string;
  content: string;
}

export interface ScriptStep extends Step {
  type: 'script';
  properties: {
    script: Script;
  };
}

export interface AgentStep extends Step {
  type: 'agent';
  properties: {
    prompt: string;
  };
}

export interface NotificationStep extends Step {
  type: 'notification';
  properties: {
    userList: string;
  };
}

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
