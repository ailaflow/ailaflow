import { AiBindingsStore, buildAiBinding, buildAiBindingStoreFactory } from './ai-bindings';

export const containerEditorSetterAiBindings = [
  buildAiBinding('container_editor_get_is_enabled').arg<void>({
    description: 'Get whether the container is enabled'
  }),
  buildAiBinding('container_editor_set_is_enabled').arg<{
    isEnabled: boolean;
  }>({
    description: 'Set whether the container is enabled',
    parameters: {
      type: 'object',
      properties: {
        isEnabled: {
          type: 'boolean',
          description: 'Whether the container should be enabled'
        }
      },
      required: ['isEnabled']
    }
  }),
  buildAiBinding('container_editor_get_name').arg<void>({
    description: 'Get the name of the container'
  }),
  buildAiBinding('container_editor_set_name').arg<{
    name: string;
  }>({
    description: 'Set the name of the container',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The new name of the container'
        }
      },
      required: ['name']
    }
  })
] as const;

export type ContainerEditorAiBindingsStore = AiBindingsStore<typeof containerEditorSetterAiBindings>;

export const containerEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof containerEditorSetterAiBindings>(
  containerEditorSetterAiBindings,
  'You are not on a container page.'
);
