import { ToolboxConfiguration } from 'sequential-workflow-designer';
import {
  ScriptStep,
  AgentStep,
  TaskStep,
  NotificationStep,
  FileContent,
  FormDefinition,
  ScriptDefinition,
  ReturnStep,
  ProcessDefinition,
  PROCESS_VERSION,
  TaskFinalizationPolicy,
  BranchStep
} from '@ailaflow/shared';

export function createBlankDefinition(): ProcessDefinition {
  return {
    properties: {
      startVariableNames: [],
      variables: [],
      version: PROCESS_VERSION
    },
    sequence: []
  };
}

export function createEmptyFormDefinition(): FormDefinition {
  return {
    inputExamples: [],
    html: `<p>Edit the HTML, CSS, and JavaScript tabs to build your form.</p>
<button type="button" onclick="submitForm()">Submit</button>`,
    css: `html {
  margin: 0; 
  padding: 0;
}
body {
  font: 14px ui-sans-serif, system-ui, sans-serif;
  margin: 0; 
  padding: 15px;
  background: #F2F5F9;
}
`,
    js: `async function submitForm() {
  try {
    await ailaflow.submitForm({
      // Add form data here
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    // Display the error message to the user
  }
}
`
  };
}

function createEmptyScriptDefinition(): ScriptDefinition {
  const SCRIPT_PACKAGE_JSON = JSON.stringify(
    {
      name: 'script',
      private: true,
      dependencies: {
        '@ailaflow/bridge-lib': 'file:/bridge/lib'
      }
    },
    null,
    2
  );
  const SCRIPT_MAIN_JS = [
    `const ailaflow = require('@ailaflow/bridge-lib');`,
    ``,
    `async function main() {`,
    `  // const test = await ailaflow.readVariable('$test');`,
    `}`,
    `main();`
  ].join('\n');

  const contents: FileContent[] = [
    {
      mimeType: 'text/json',
      path: 'package.json',
      content: SCRIPT_PACKAGE_JSON
    },
    {
      mimeType: 'text/javascript',
      path: 'main.js',
      content: SCRIPT_MAIN_JS
    }
  ];
  return {
    sandboxName: 'default',
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
    prompt: {
      type: 'string',
      value: ''
    },
    allowedProcesses: null,
    allowedVariableNames: [],
    isTerminalAllowed: false,
    sandboxName: 'default'
  }
};

const taskStep: Omit<TaskStep, 'id'> = {
  type: 'task',
  name: 'Task',
  componentType: 'task',
  properties: {
    title: {
      type: 'string',
      value: 'Task'
    },
    inputVariableNames: [],
    outputVariableNames: [],
    userExpression: { type: 'string', value: '' },
    form: createEmptyFormDefinition(),
    finalizationPolicy: TaskFinalizationPolicy.ALL_ASSIGNEES
  }
};

const notificationStep: Omit<NotificationStep, 'id'> = {
  type: 'notification',
  name: 'Notification',
  componentType: 'task',
  properties: {
    userExpression: { type: 'string', value: '' },
    notification: { type: 'string', value: 'Enter some notification here' }
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

const branchStep: Omit<BranchStep, 'id'> = {
  type: 'branch',
  name: 'Branch',
  componentType: 'switch',
  properties: {
    branchSelectorVariableName: ''
  },
  branches: {
    true: [],
    false: []
  }
};

export const toolboxConfiguration: ToolboxConfiguration = {
  groups: [
    {
      name: 'Steps',
      steps: [scriptStep, agentStep, taskStep, notificationStep, returnStep, branchStep]
    }
  ]
};
