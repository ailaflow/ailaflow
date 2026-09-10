import { UserAttributesValidator, UserValidator } from '@ailaflow/shared';
import { toolError, toolSuccess } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import { UserEditorState } from './user-editor-state';

export function useUserEditorAi(state: UserEditorState, save: () => Promise<void>) {
  useAiStore(
    'userEditor',
    store =>
      store.bind({
        async getDetails() {
          return {
            name: state.name,
            isAdmin: state.isAdmin,
            hasPasswordChange: state.password.length > 0,
            attributes: state.getAttributes(),
            hasUnsavedChanges: state.isDirty
          };
        },
        async setName(arg) {
          if (!state.isNew) {
            return toolError('Saved user names cannot be changed');
          }
          const error = UserValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('User name updated');
        },
        async setIsAdmin(arg) {
          state.setIsAdmin(arg.isAdmin);
          return toolSuccess('User admin status updated');
        },
        async getAttributes() {
          return state.getAttributes();
        },
        async setAttribute(arg) {
          const error = UserAttributesValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setAttribute(arg.name, arg.value);
          return toolSuccess('User attribute updated');
        },
        async removeAttribute(arg) {
          if (!(arg.name in state.getAttributes())) {
            return toolError(`Cannot find user attribute "${arg.name}"`);
          }
          state.removeAttributeByName(arg.name);
          return toolSuccess('User attribute removed');
        },
        async getValidationErrors() {
          return {
            nameError: state.nameError,
            passwordError: state.passwordError,
            attributeError: state.attributeError
          };
        },
        async hasUnsavedChanges() {
          return {
            hasUnsavedChanges: state.isDirty
          };
        },
        async save() {
          if (!state.canSave) {
            return toolError('Cannot save user due to validation errors or no changes made');
          }
          await save();
          return toolSuccess('User saved');
        }
      }),
    [state, save]
  );
}
