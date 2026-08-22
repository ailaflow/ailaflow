import { SequentialWorkflowDesigner, WrappedDefinition } from 'sequential-workflow-designer-react';
import { useProcessEditor } from './process-editor-context';
import { RootEditor } from './designer/root-editor';
import { StepEditor } from './designer/step-editor';
import { toolboxConfiguration } from './designer-configuration';
import { useRef } from 'react';

export function Designer() {
  const state = useProcessEditor();
  const isFirstUpdate = useRef(true);

  function setDefinition(newDefinition: WrappedDefinition) {
    state.setDefinition(newDefinition, !isFirstUpdate.current);
    isFirstUpdate.current = false;
  }

  return (
    <SequentialWorkflowDesigner
      theme="soft"
      controller={state.controller}
      definition={state.definition}
      controlBar={true}
      onDefinitionChange={setDefinition}
      selectedStepId={state.selectedStepId}
      onSelectedStepIdChanged={state.setSelectedStepId}
      rootEditor={<RootEditor state={state} />}
      stepEditor={<StepEditor state={state} />}
      stepsConfiguration={{
        iconUrlProvider: (_, type) => {
          return `/assets/steps/${type}.svg`;
        }
      }}
      validatorConfiguration={{
        root: state.rootValidator.validateRoot,
        step: state.stepValidator.validateStep
      }}
      toolboxConfiguration={toolboxConfiguration}
    />
  );
}
