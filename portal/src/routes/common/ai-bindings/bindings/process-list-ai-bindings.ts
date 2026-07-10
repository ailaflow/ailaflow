import { aiRoute, storeFactoryFromRoute, tool } from '../ai-bindings';

const processListRoute = aiRoute('processList')
  .paths(['/admin/processes'])
  .unavailable('You are not on a process list page.')
  .tools({
    getProcesses: tool('Get all created processes.'),
    createNew: tool('Open a page to create a new process.')
  });

export const processListAiBindingsFactory = storeFactoryFromRoute(processListRoute);

export type ProcessListAiBindingsStore = ReturnType<typeof processListAiBindingsFactory>;
