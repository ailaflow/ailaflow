import { SandboxDto } from '@aila/model';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { SandboxEditorView } from '../../views/sandbox-editor/sandbox-editor-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { useSandboxEditorAi } from './sandbox-editor-ai';
import { useSandboxEditorState } from './sandbox-editor-state';

export function SandboxEditor(props: { sandbox?: SandboxDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const state = useSandboxEditorState(props.sandbox);

  async function save() {
    const abortSignal = AbortSignal.timeout(5_000);
    await apiClient.sandbox.upsertSandbox(abortSignal, state.toUpsertRequest());
    if (state.isNew) {
      navigate(`/admin/sandboxes/${state.name}`);
    } else {
      state.markSaved();
    }
  }

  useSandboxEditorAi(state, save);
  useUnsavedChangesController(state.isDirty);

  const detailsId = 'admin-sandbox-editor-details';

  return (
    <ResourceEditorView
      icon="+"
      name={state.name}
      isNameReadOnly={!state.isNew}
      isNameValid={state.nameError === null}
      canSave={state.canSave}
      onSave={save}
      onNameChange={state.setName}
      detailsId={detailsId}
      details={
        <ResourceSimpleDetailsView
          id={detailsId}
          description={state.description}
          descriptionError={state.descriptionError}
          onDescriptionChange={state.setDescription}
        />
      }
      areDetailsVisible={true}
      canSwitch={false}
    >
      <SandboxEditorView
        isEnabled={state.isEnabled}
        configuration={state.configuration}
        secrets={state.secrets}
        onIsEnabledChange={state.setIsEnabled}
        onConfigurationChange={state.setConfiguration}
        onSecretAdd={state.addSecret}
        onSecretRemove={state.removeSecret}
        onSecretKeyChange={state.setSecretKey}
        onSecretValueChange={state.setSecretValue}
      />
    </ResourceEditorView>
  );
}
