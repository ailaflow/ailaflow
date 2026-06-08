import { AiBindingsStore, buildAiBinding, buildAiBindingStoreFactory } from './ai-bindings';

export const globalSetterAiBindings = [
  buildAiBinding('get_current_page').arg<void>({
    description: 'Get currently opened page.'
  })
] as const;

export type GlobalAiBindingsStore = AiBindingsStore<typeof globalSetterAiBindings>;

export const globalAiBindingsFactory = buildAiBindingStoreFactory<typeof globalSetterAiBindings>(
  globalSetterAiBindings,
  'Global context is not available.'
);
