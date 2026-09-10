import { TableValidator } from '@ailaflow/shared';
import { toolError, toolSuccess } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import { TableEditorState } from './table-editor-state';

export function useTableEditorAi(state: TableEditorState, save: () => Promise<void>) {
  useAiStore(
    'tableEditor',
    store =>
      store.bind({
        getDetails: async () => ({
          name: state.name,
          description: state.description
        }),
        setName: async arg => {
          if (!state.isNew) {
            return toolError('Table name cannot be changed.');
          }
          const error = TableValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('Updated.');
        },
        setDescription: async arg => {
          const error = TableValidator.validateDescription(arg.description);
          if (error) {
            return toolError(error);
          }
          state.setDescription(arg.description);
          return toolSuccess('Updated.');
        },
        save: async () => {
          if (!state.canSave) {
            return toolError('Cannot save table due to validation errors or no changes made.');
          }
          await save();
          return toolSuccess('Saved.');
        }
      }),
    [state, save]
  );
}
