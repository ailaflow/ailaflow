import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const processListAiBindings = [
  aiBinding('processList_getProcesses', 'Get all created processes.').void(),
  aiBinding('processList_createNew', 'Open a page to create a new process.').void()
];

export type ProcessListAiBindingsStore = AiBindingsStore<typeof processListAiBindings>;

const processListRoute = aiRoute('process_list', ['/admin/processes'], 'You are not on a process list page.').void();

export const processListAiBindingsFactory = buildAiBindingStoreFactory<typeof processListAiBindings, void>(
  processListAiBindings,
  processListRoute
);
