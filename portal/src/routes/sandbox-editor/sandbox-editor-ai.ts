import { DockerfileContent, SandboxValidator } from '@ailaflow/shared';
import { toolError, toolSuccess } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import { SandboxEditorState } from './sandbox-editor-state';

export function useSandboxEditorAi(state: SandboxEditorState, save: () => Promise<void>) {
  useAiStore(
    'sandboxEditor',
    store =>
      store.bind({
        getDetails: async () => {
          return {
            name: state.name,
            description: state.description,
            isEnabled: state.isEnabled,
            configurationPrefix: DockerfileContent.prefix,
            configuration: state.configuration,
            configurationSuffix: DockerfileContent.suffix,
            secretNames: state.getSecretNames()
          };
        },
        setName: async arg => {
          if (!state.isNew) {
            return toolError('Sandbox name cannot be changed.');
          }
          const error = SandboxValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('Updated.');
        },
        setIsEnabled: async arg => {
          state.setIsEnabled(arg.isEnabled);
          return toolSuccess('Updated.');
        },
        setConfiguration: async arg => {
          state.setConfiguration(arg.configuration);
          return toolSuccess('Updated.');
        },
        save: async () => {
          if (!state.canSave) {
            return toolError('Cannot save sandbox due to validation errors or no changes made.');
          }
          await save();
          return toolSuccess('Saved.');
        }
      }),
    [state, save]
  );
}
