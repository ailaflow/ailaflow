import { ProcessEditorOverlayType, useProcessEditor } from './process-editor-context';
import { SchemaEditorOverlay } from './overlays/schema-editor-overlay';
import { Designer } from './designer';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormEditorOverlay } from './overlays/form-editor-overlay';
import { ScriptEditorOverlay } from './overlays/script-editor-overlay';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { DesignerUtils } from './designer-utils';
import { useProcessEditorAi } from './process-editor-ai';

export function ProcessEditor() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = !state.overlay;
  const canSave = Boolean(state.isValid && state.isDirty);
  const canTest = Boolean(state.isValid && !state.isDirty);

  function openTester() {
    navigate(`/admin/processes/${state.name}/test`);
  }

  async function save() {
    if (!state.isValid) {
      throw new Error('Cannot save an invalid definition');
    }
    if (!state.isDirty) {
      return;
    }

    const timeout = AbortSignal.timeout(5_000);

    DesignerUtils.updateDefinitionHashes(state.walker, state.definition.value);
    const hash = DesignerUtils.calcDefinitionHash(state.definition.value);

    const response = await apiClient.process.saveProcess(timeout, {
      insert: state.isNew,
      description: state.description,
      name: state.name,
      userAccessExpression: state.userAccessExpression,
      definition: state.definition.value,
      hash
    });

    if (state.isNew) {
      navigate(`/admin/processes/${response.name}`);
    } else {
      state.setIsDirty(false);
    }
  }

  useUnsavedChangesController(state.isDirty);
  useProcessEditorAi(state, save);

  return (
    <ResourceEditorView
      icon="/"
      name={state.name}
      isNameValid={state.nameError === null}
      isNameReadOnly={!isDesigner || !state.isNew}
      onNameChange={name => state.setName(name, false)}
      detailsId="admin-process-editor-details"
      details={
        isDesigner ? (
          <ResourceSimpleDetailsView
            id="admin-process-editor-details"
            description={state.description}
            descriptionError={state.descriptionError}
            userAccessExpression={state.userAccessExpression}
            userAccessExpressionError={state.userAccessExpressionError}
            onDescriptionChange={description => state.setDescription(description, false)}
            onUserAccessExpressionChange={userAccessExpression => state.setUserAccessExpression(userAccessExpression, false)}
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
      {isDesigner && <Designer />}
      {state.overlay?.type === ProcessEditorOverlayType.SCHEMA_EDITOR && <SchemaEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.FORM_EDITOR && <FormEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.SCRIPT_EDITOR && <ScriptEditorOverlay />}
    </ResourceEditorView>
  );
}
