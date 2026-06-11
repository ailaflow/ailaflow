import { ToolboxConfiguration } from 'sequential-workflow-designer';
import { ScriptStep, AgentStep, TaskStep, NotificationStep, ScriptContent } from '@aila/model';
import { fnv1a } from '../../core/fnv1a';

const SCRIPT_PACKAGE_JSON = JSON.stringify(
  {
    name: 'test',
    private: true,
    dependencies: {
      '@aila/bridge-lib': 'file:/bridge/lib'
    }
  },
  null,
  2
);

const SCRIPT_MAIN_JS = [
  `const { readInput, writeOutput } = require('@aila/bridge-lib');`,
  ``,
  `async function main() {`,
  `  const input = readInput();`,
  `  writeOutput({ /* Output here */ });`,
  `}`,
  `main();`
].join('\n');

const scriptDefaultContents: ScriptContent[] = [
  {
    mimeType: 'text/json',
    path: 'package.json',
    modifiedAt: 0,
    content: SCRIPT_PACKAGE_JSON
  },
  {
    mimeType: 'text/javascript',
    path: 'main.js',
    content: SCRIPT_MAIN_JS,
    modifiedAt: 0
  }
];
const scriptStep: Omit<ScriptStep, 'id'> = {
  type: 'script',
  name: 'Script',
  componentType: 'task',
  properties: {
    script: {
      sandboxName: 'default',
      hash: fnv1a(scriptDefaultContents),
      contents: scriptDefaultContents
    }
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
