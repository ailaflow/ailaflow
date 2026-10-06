import { useRef } from 'react';
import { ProcessEditorOverlayType, useProcessEditor } from './process-editor-context';
import { SchemaEditorOverlay } from './overlays/schema-editor-overlay';
import { Designer } from './designer';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router';
import { FormEditorOverlay } from './overlays/form-editor-overlay';
import { ScriptEditorOverlay } from './overlays/script-editor-overlay';
import { useUnsavedChangesController } from '../common/admin-portal';
import { DesignerUtils } from './designer-utils';
import { useProcessEditorAi } from './process-editor-ai';
import { ProcessIcon } from '../../views/common/process-icon';
import { ProcessEditorDetailsView } from '../../views/process-editor/process-editor-details-view';

export function ProcessEditor() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const isSaving = useRef(false);

  const isDesigner = !state.overlay;
  const canSave = Boolean(state.isValid && state.isDirty);

  async function save() {
    if (isSaving.current) {
      return;
    }
    isSaving.current = true;
    try {
      if (!state.isValid) {
        throw new Error('Cannot save an invalid definition');
      }
      if (!state.isDirty) {
        return;
      }

      const timeout = AbortSignal.timeout(5_000);

      const hash = DesignerUtils.calcDefinitionHash(state.definition.value);

      const response = await apiClient.process.saveProcess(timeout, {
        insert: state.isNew,
        description: state.description,
        name: state.name,
        userAccessExpression: state.userAccessExpression,
        display: state.display,
        executionMode: state.executionMode,
        traceRetention: state.traceRetention,
        icon: state.icon,
        definition: state.definition.value,
        hash
      });

      if (state.isNew) {
        navigate(`/admin/processes/${response.name}`);
      } else {
        state.markSaved(hash);
      }
    } finally {
      isSaving.current = false;
    }
  }

  useUnsavedChangesController(state.isDirty);
  useProcessEditorAi(state, save);

  async function uploadIcon(file: File): Promise<void> {
    try {
      const icon = await file.text();
      const document = new DOMParser().parseFromString(icon, 'image/svg+xml');
      if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
        throw new Error('The selected file is not a valid SVG');
      }
      state.setIcon(icon);
    } catch (e) {
      window.alert(`Failed to upload icon: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <ResourceEditorView
      icon="/"
      leadingVisual={<ProcessIcon name={state.name} icon={state.icon} className="h-9 w-9" />}
      name={state.name}
      isNameValid={state.nameError === null}
      isNameReadOnly={!isDesigner || !state.isNew}
      onNameChange={name => state.setName(name, false)}
      detailsId="admin-process-editor-details"
      details={
        <ProcessEditorDetailsView
          id="admin-process-editor-details"
          description={state.description}
          descriptionError={state.descriptionError}
          userAccessExpression={state.userAccessExpression}
          userAccessExpressionError={state.userAccessExpressionError}
          display={state.display}
          executionMode={state.executionMode}
          traceRetention={state.traceRetention}
          hasIcon={state.icon !== null}
          onDescriptionChange={description => state.setDescription(description, false)}
          onUserAccessExpressionChange={userAccessExpression => state.setUserAccessExpression(userAccessExpression, false)}
          onDisplayChange={state.setDisplay}
          onExecutionModeChange={state.setExecutionMode}
          onTraceRetentionChange={state.setTraceRetention}
          onIconUpload={uploadIcon}
          onIconReset={() => state.setIcon(null)}
        />
      }
      canSave={canSave}
      onSave={save}
      viewSwitcherOptions={[
        { label: 'Editor', href: `/admin/processes/${state.name}`, selected: true },
        {
          label: 'Test',
          href: `/admin/processes/${state.name}/test`,
          disabledReason: !state.isValid ? 'Fix validation errors before testing.' : undefined
        },
        { label: 'Cron jobs', href: `/admin/processes/${state.name}/cron-jobs` }
      ]}
      viewSwitcherDisabledReason={state.isNew || state.isDirty ? 'Please save changes' : undefined}
    >
      {isDesigner && <Designer />}
      {state.overlay?.type === ProcessEditorOverlayType.SCHEMA_EDITOR && <SchemaEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.FORM_EDITOR && <FormEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.SCRIPT_EDITOR && <ScriptEditorOverlay />}
    </ResourceEditorView>
  );
}
