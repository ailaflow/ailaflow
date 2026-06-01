import { ProcessEditorMode, useProcessEditor } from './process-editor-context';
import { SchemaSubEditor } from './sub-editors/schema-sub-editor';
import { DesignerSubEditor } from './sub-editors/designer-sub-editor';
import { useApiClient } from '../../auth/auth-context';
import { ProcessEditor } from '../../components/process-editor/process-editor';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const isDesigner = state.mode === ProcessEditorMode.DESIGNER;
  const canSave = Boolean(state.definition.isValid && state.isDirty);

  async function save() {
    if (!canSave) {
      return;
    }

    try {
      const timeout = AbortSignal.timeout(5_000);
      const response = await apiClient.process.updateProcess(timeout, {
        id: state.id,
        description: state.description,
        name: state.name,
        userList: '',
        definition: state.definition.value
      });

      state.setId(response.id, false);
    } catch (e) {
      alert(`Failed to save process: ${(e as Error).message ?? e}`);
    }
  }

  return (
    <ProcessEditor
      name={state.name}
      isNameValid={state.isNameValid}
      isNameReadOnly={!isDesigner}
      onNameChange={state.setName}
      description={state.description}
      onDescriptionChange={state.setDescription}
      areDetailsVisible={isDesigner}
      canSave={canSave}
      onSave={save}
    >
      {isDesigner && <DesignerSubEditor />}
      {state.mode === ProcessEditorMode.SCHEMA_EDITOR && <SchemaSubEditor />}
    </ProcessEditor>
  );
}
