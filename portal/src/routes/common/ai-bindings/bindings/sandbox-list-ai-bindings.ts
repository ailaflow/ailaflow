import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const sandboxListAiBindings = [
  aiBinding('sandboxList_getSandboxes', 'Get all created sandboxes.').void(),
  aiBinding('sandboxList_createNew', 'Open a form to create a new sandbox.').void()
];

export type SandboxListAiBindingsStore = AiBindingsStore<typeof sandboxListAiBindings>;

const sandboxListRoute = aiRoute('sandboxList', ['/admin/sandboxes'], 'You are not on a sandbox list page.').void();

export const sandboxListAiBindingsFactory = buildAiBindingStoreFactory<typeof sandboxListAiBindings, void>(
  sandboxListAiBindings,
  sandboxListRoute
);
