import { SequentialWorkflowDesigner } from 'sequential-workflow-designer-react';
import { useProcessEditor } from '../process-editor-context';
import { RootEditor } from '../designer-editors/root-editor';
import { StepEditor } from '../designer-editors/step-editor';
import { ProcessDefinitionValidator } from '@aila/model';
import { toolboxConfiguration } from '../designer-configuration';

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
