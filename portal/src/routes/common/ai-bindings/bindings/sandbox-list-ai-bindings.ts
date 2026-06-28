import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const sandboxListAiBindings = [
  aiBinding('sandbox_list_get_sandboxes', 'Get all created sandboxes.').void(),
  aiBinding('sandbox_list_create_new', 'Open a form to create a new sandbox.').void()
];

export type SandboxListAiBindingsStore = AiBindingsStore<typeof sandboxListAiBindings>;

const sandboxListRoute = aiRoute('sandbox_list', ['/admin/sandboxes'], 'You are not on a sandbox list page.').void();

export const sandboxListAiBindingsFactory = buildAiBindingStoreFactory<typeof sandboxListAiBindings, void>(
  sandboxListAiBindings,
  sandboxListRoute
);
