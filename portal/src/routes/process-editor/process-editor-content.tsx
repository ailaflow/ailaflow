import { ProcessEditorMode, useProcessEditor } from './process-editor-context';
import { SchemaSubEditor } from './sub-editors/schema-sub-editor';
import { DesignerSubEditor } from './sub-editors/designer-sub-editor';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormSubEditor } from './sub-editors/form-sub-editor';
import { ScriptSubEditor } from './sub-editors/script-sub-editor';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = state.mode === ProcessEditorMode.DESIGNER;
  const canSave = Boolean(state.definition.isValid && state.isDirty);
  const canTest = Boolean(state.definition.isValid && !state.isDirty);

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

      state.setId(response.id, false);
    } catch (e) {
      alert(`Failed to save process: ${(e as Error).message ?? e}`);
    }
  }

  return (
    <ResourceEditorView
      icon="/"
      name={state.name}
      isNameValid={state.isNameValid}
      isNameReadOnly={!isDesigner}
      onNameChange={state.setName}
      detailsId="admin-process-editor-details"
      details={isDesigner ? <Details description={state.description} onDescriptionChange={state.setDescription} /> : undefined}
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

function Details(props: { description: string; onDescriptionChange: (description: string) => void }) {
  return (
    <div id="admin-process-editor-details" className="pt-1">
      <label className="flex h-8 w-full max-w-md overflow-hidden rounded-md border border-transparent bg-transparent transition-colors focus-within:border-slate-300 focus-within:bg-white">
        <input
          type="text"
          value={props.description}
          onChange={e => props.onDescriptionChange(e.target.value)}
          className="h-full min-w-0 flex-1 px-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
          placeholder="Description"
        />
      </label>
    </div>
  );
}
