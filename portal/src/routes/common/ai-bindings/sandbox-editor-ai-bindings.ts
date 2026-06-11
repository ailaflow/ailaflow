import { AiBindingsStore, buildAiBinding, buildAiBindingStoreFactory } from './ai-bindings';

export const sandboxEditorSetterAiBindings = [
  buildAiBinding('sandbox_editor_get_is_enabled').arg<void>({
    description: 'Get whether the sandbox is enabled'
  }),
  buildAiBinding('sandbox_editor_set_is_enabled').arg<{
    isEnabled: boolean;
  }>({
    description: 'Set whether the sandbox is enabled',
    parameters: {
      type: 'object',
      properties: {
        isEnabled: {
          type: 'boolean',
          description: 'Whether the sandbox should be enabled'
        }
      },
      required: ['isEnabled']
    }
  }),
  buildAiBinding('sandbox_editor_get_name').arg<void>({
    description: 'Get the name of the sandbox'
  }),
  buildAiBinding('sandbox_editor_set_name').arg<{
    name: string;
  }>({
    description: 'Set the name of the sandbox',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The new name of the sandbox'
        }
      },
      required: ['name']
    }
  })
] as const;

export type SandboxEditorAiBindingsStore = AiBindingsStore<typeof sandboxEditorSetterAiBindings>;

export const sandboxEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof sandboxEditorSetterAiBindings>(
  sandboxEditorSetterAiBindings,
  'You are not on a sandbox page.'
);
