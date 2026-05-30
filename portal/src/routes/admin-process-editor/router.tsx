import { SequentialWorkflowDesigner } from 'sequential-workflow-designer-react';
import { RootEditor } from './root-editor';
import { StepEditor } from './step-editor';
import { AdminProcessEditorMode, useAdminProcessEditor } from './admin-process-editor-context';
import { ProcessDefinitionValidator } from '@aila/model';
import { SchemaEditor } from './schema-editor';

export function Router() {
  const state = useAdminProcessEditor();

  if (state.mode === AdminProcessEditorMode.DESIGNER) {
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
        toolboxConfiguration={{
          groups: []
        }}
      />
    );
  }

  if (state.mode === AdminProcessEditorMode.SCHEMA_EDITOR) {
    return <SchemaEditor />;
  }
}
