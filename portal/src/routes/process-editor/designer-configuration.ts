import { ToolboxConfiguration } from 'sequential-workflow-designer';
import { ScriptStep, AgentStep, TaskStep, NotificationStep } from '@aila/model';

const scriptStep: Omit<ScriptStep, 'id'> = {
  type: 'script',
  name: 'Script',
  componentType: 'task',
  properties: {
    script: ''
  }
};

const agentStep: Omit<AgentStep, 'id'> = {
  type: 'agent',
  name: 'Agent',
  componentType: 'task',
  properties: {
    prompt: ''
  }
};

const taskStep: Omit<TaskStep, 'id'> = {
  type: 'task',
  name: 'Task',
  componentType: 'task',
  properties: {
    user: '',
    outputVariableNames: [],
    deadlineMinutes: 60,
    stopProcessOnDeadline: false
  }
};

const notificationStep: Omit<NotificationStep, 'id'> = {
  type: 'notification',
  name: 'Notification',
  componentType: 'task',
  properties: {
    userList: ''
  }
};

export const toolboxConfiguration: ToolboxConfiguration = {
  groups: [
    {
      name: 'Steps',
      steps: [scriptStep, agentStep, taskStep, notificationStep]
    }
  ]
};
