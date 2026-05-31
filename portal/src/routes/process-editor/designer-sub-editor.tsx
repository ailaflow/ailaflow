import { StepDefinition, ToolboxConfiguration } from 'sequential-workflow-designer';
import { SequentialWorkflowDesigner } from 'sequential-workflow-designer-react';
import { useProcessEditor } from './process-editor-context';
import { RootEditor } from './designer-editors/root-editor';
import { StepEditor } from './designer-editors/step-editor';
import { ProcessDefinitionValidator, ScriptStep } from '@aila/model';

const emptyScriptStep: StepDefinition = {
  type: 'script',
  name: 'Script',
  componentType: 'task',
  properties: {
    script: ''
  }
};

const toolboxConfiguration: ToolboxConfiguration = {
  groups: [
    {
      name: 'Steps',
      steps: [emptyScriptStep]
    }
  ]
};

export function DesignerSubEditor() {
  const state = useProcessEditor();

  return (
    <SequentialWorkflowDesigner
      theme="soft"
      definition={state.definition}
      controlBar={true}
      onDefinitionChange={state.setDefinition}
      rootEditor={<RootEditor editorState={state} />}
      stepEditor={<StepEditor />}
      stepsConfiguration={{}}
      validatorConfiguration={{
        root: ProcessDefinitionValidator.validateRoot
      }}
      toolboxConfiguration={toolboxConfiguration}
    />
  );
}
