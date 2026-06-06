import { SequentialWorkflowDesigner } from 'sequential-workflow-designer-react';
import { useProcessEditor } from '../process-editor-context';
import { RootEditor } from '../designer-editors/root-editor';
import { StepEditor } from '../designer-editors/step-editor';
import { toolboxConfiguration } from '../designer-configuration';

export function DesignerSubEditor() {
  const state = useProcessEditor();

  return (
    <SequentialWorkflowDesigner
      theme="soft"
      definition={state.definition}
      controlBar={true}
      onDefinitionChange={state.setDefinition}
      selectedStepId={state.selectedStepId}
      onSelectedStepIdChanged={state.setSelectedStepId}
      rootEditor={<RootEditor editorState={state} />}
      stepEditor={<StepEditor editorState={state} />}
      stepsConfiguration={{}}
      validatorConfiguration={{
        root: state.rootValidator.validateRoot,
        step: state.stepValidator.validateStep
      }}
      toolboxConfiguration={toolboxConfiguration}
    />
  );
}
