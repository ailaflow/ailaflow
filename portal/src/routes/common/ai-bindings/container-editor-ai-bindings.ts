import { AiBindingsStore, buildAiBinding, buildAiBindingStoreFactory } from './ai-bindings';

export const containerEditorSetterAiBindings = [
  buildAiBinding('container_editor_set_is_enabled').arg<boolean>({
    description: 'Set whether the container is enabled',
    parameters: {
      type: 'boolean'
    }
  }),
  buildAiBinding('container_editor_get_name').arg<string>({
    description: 'Get the name of the container'
  }),
  buildAiBinding('container_editor_set_name').arg<string>({
    description: 'Set the name of the container',
    parameters: {
      type: 'string'
    }
  })
] as const;

export type ContainerEditorAiBindingsStore = AiBindingsStore<typeof containerEditorSetterAiBindings>;

export const containerEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof containerEditorSetterAiBindings>(
  containerEditorSetterAiBindings,
  'You are not on a container page.'
);
