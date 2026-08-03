import { ToolboxConfiguration } from 'sequential-workflow-designer';
import { ScriptStep, AgentStep, TaskStep, NotificationStep, FileContent, FormDefinition, ScriptDefinition, ReturnStep } from '@aila/model';

export function createEmptyFormDefinition(): FormDefinition {
  return {
    inputExamples: [],
    html: '<form>\n<h3>Test Form</h3>\n</form>\n',
    css: 'body {\n  font: 14px/1.3em Arial, Tahoma;\n  margin: 0;\n  padding: 20px;\n  background-color: white;\n}\n',
    js: '// JS here'
  };
}

function createEmptyScriptDefinition(): ScriptDefinition {
  const SCRIPT_PACKAGE_JSON = JSON.stringify(
    {
      name: 'process-script',
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

  const contents: FileContent[] = [
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
  return {
    sandboxName: 'default',
    hash: `~`, // Will be updated on save
    contents
  };
}

const scriptStep: Omit<ScriptStep, 'id'> = {
  type: 'script',
  name: 'Script',
  componentType: 'task',
  properties: {
    script: createEmptyScriptDefinition()
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
    inputVariableNames: [],
    outputVariableNames: [],
    userExpression: '',
    form: createEmptyFormDefinition()
  }
};

const notificationStep: Omit<NotificationStep, 'id'> = {
  type: 'notification',
  name: 'Notification',
  componentType: 'task',
  properties: {
    userExpression: '',
    notification: 'Put your notification message here'
  }
};

const returnStep: Omit<ReturnStep, 'id'> = {
  type: 'return',
  name: 'Return',
  componentType: 'task',
  properties: {
    outputVariableNames: []
  }
};

export const toolboxConfiguration: ToolboxConfiguration = {
  groups: [
    {
      name: 'Steps',
      steps: [scriptStep, agentStep, taskStep, notificationStep, returnStep]
    }
  ]
};
