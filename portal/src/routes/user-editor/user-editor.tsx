import { UserDto } from '@aila/model';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { UserEditorView } from '../../views/user-editor/user-editor-view';
import { useUserEditorAi } from './user-editor-ai';
import { useUserEditorState } from './user-editor-state';
import { useUnsavedChangesController } from '../common/admin-portal';

export function UserEditor(props: { user: UserDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const state = useUserEditorState(props.user);

  async function save() {
    const abortSignal = AbortSignal.timeout(5_000);
    const response = await apiClient.user.updateUser(abortSignal, state.toUpdateRequest(props.user.id));
    state.markSaved();
    navigate(`/admin/users/${response.id}`);
  }

  useUserEditorAi(state, save);
  useUnsavedChangesController(state.isDirty);

  return (
    <ResourceEditorView
      icon="@"
      name={state.name}
      isNameReadOnly={false}
      isNameValid={state.nameError === null}
      canSave={state.canSave}
      onSave={save}
      onNameChange={state.setName}
      canSwitch={false}
      switchLabel=""
    >
      <UserEditorView
        isAdmin={state.isAdmin}
        password={state.password}
        attributes={state.attributes}
        attributeError={state.attributeError}
        onIsAdminChange={state.setIsAdmin}
        onPasswordChange={state.setPassword}
        onAttributeAdd={state.addAttribute}
        onAttributeRemove={state.removeAttribute}
        onAttributeChange={state.updateAttribute}
      />
    </ResourceEditorView>
  );
}
