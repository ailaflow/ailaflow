import { ProcessEditorMode, useProcessEditor } from './process-editor-context';
import { SchemaSubEditor } from './sub-editors/schema-sub-editor';
import { DesignerSubEditor } from './sub-editors/designer-sub-editor';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormSubEditor } from './sub-editors/form-sub-editor';
import { ScriptSubEditor } from './sub-editors/script-sub-editor';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = state.mode === ProcessEditorMode.DESIGNER;
  const canSave = Boolean(state.isValid && state.isDirty);
  const canTest = Boolean(state.isValid && !state.isDirty);

  function openTester() {
    navigate(`/admin/processes/${state.id}/test`);
  }

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

      if (state.id) {
        state.setDirtyFalse();
      } else {
        navigate(`/admin/processes/${response.id}`);
      }
    } catch (e) {
      alert(`Failed to save process: ${(e as Error).message ?? e}`);
    }
  }

  return (
    <ResourceEditorView
      icon="/"
      name={state.name}
      isNameValid={state.nameError === null}
      isNameReadOnly={!isDesigner}
      onNameChange={state.setName}
      detailsId="admin-process-editor-details"
      details={
        isDesigner ? (
          <ResourceSimpleDetailsView
            id="admin-process-editor-details"
            description={state.description}
            descriptionError={state.descriptionError}
            onDescriptionChange={state.setDescription}
          />
        ) : undefined
      }
      areDetailsVisible={isDesigner}
      canSave={canSave}
      onSave={isDesigner ? save : undefined}
      switchLabel="Test"
      canSwitch={canTest}
      onSwitch={isDesigner ? openTester : undefined}
    >
      {isDesigner && <DesignerSubEditor />}
      {state.mode === ProcessEditorMode.SCHEMA_EDITOR && <SchemaSubEditor />}
      {state.mode === ProcessEditorMode.FORM_EDITOR && <FormSubEditor />}
      {state.mode === ProcessEditorMode.SCRIPT_EDITOR && <ScriptSubEditor />}
    </ResourceEditorView>
  );
}
