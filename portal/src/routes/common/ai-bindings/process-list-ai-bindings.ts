import { route, storeFactory, tool } from '@aibindkit/react';

const processListRoute = route('processList')
  .paths(['/admin/processes'])
  .unavailable('You are not on a process list page.')
  .tools({
    getProcesses: tool('Get all created processes.'),
    createNew: tool('Open a page to create a new process.')
  });

export const processListAiStoreFactory = storeFactory(processListRoute);

export type ProcessListAiStore = ReturnType<typeof processListAiStoreFactory>;
