import { useRef } from 'react';
import { UserDto } from '@aila/model';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { UserEditorView } from '../../views/user-editor/user-editor-view';
import { useUserEditorAi } from './user-editor-ai';
import { useUserEditorState } from './user-editor-state';
import { useUnsavedChangesController } from '../common/admin-portal';

export function UserEditor(props: { user?: UserDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const isSaving = useRef(false);
  const state = useUserEditorState(props.user);

  async function save() {
    if (isSaving.current) {
      return;
    }
    isSaving.current = true;
    try {
      const abortSignal = AbortSignal.timeout(5_000);
      const response = await apiClient.user.saveUser(abortSignal, state.toSaveRequest());
      if (state.isNew) {
        navigate(`/admin/users/${response.name}`);
      } else {
        state.markSaved();
      }
    } finally {
      isSaving.current = false;
    }
  }

  useUserEditorAi(state, save);
  useUnsavedChangesController(state.isDirty);

  return (
    <ResourceEditorView
      icon="@"
      name={state.name}
      isNameReadOnly={!state.isNew}
      isNameValid={state.nameError === null}
      onNameChange={state.setName}
      canSave={state.canSave}
      onSave={save}
      viewSwitcherOptions={[
        { label: 'Editor', href: `/admin/users/${state.name}`, selected: true },
        { label: 'Telegram', href: `/admin/users/${state.name}/telegram` }
      ]}
      viewSwitcherDisabledReason={state.isNew || state.isDirty ? 'Please save changes' : undefined}
    >
      <UserEditorView
        isNew={state.isNew}
        isAdmin={state.isAdmin}
        password={state.password}
        passwordError={state.passwordError}
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
