import { SequentialWorkflowDesigner, WrappedDefinition } from 'sequential-workflow-designer-react';
import { useProcessEditor } from '../process-editor-context';
import { RootEditor } from '../designer-editors/root-editor';
import { StepEditor } from '../designer-editors/step-editor';
import { toolboxConfiguration } from '../designer-configuration';
import { useRef } from 'react';

export function DesignerSubEditor() {
  const state = useProcessEditor();
  const isFirstUpdate = useRef(true);

  function setDefinition(newDefinition: WrappedDefinition) {
    state.setDefinition(newDefinition, !isFirstUpdate.current);
    isFirstUpdate.current = false;
  }

  return (
    <SequentialWorkflowDesigner
      theme="soft"
      definition={state.definition}
      controlBar={true}
      onDefinitionChange={setDefinition}
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
