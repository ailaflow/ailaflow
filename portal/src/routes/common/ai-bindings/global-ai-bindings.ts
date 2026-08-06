import { global, globalStoreFactory, tool } from '@aibindkit/react';

const g = global().tools({
  getCurrentUser: tool('Get the current user ID and email, you can use this function on any page'),
  getTables: tool('Get the list of #tables in the system, you can use this function on any page'),
  getSandboxes: tool('Get the list of +sandboxes in the system, you can use this function on any page')
});

export const globalAiStoreFactory = globalStoreFactory(g);

export type GlobalAiBindingsStore = ReturnType<typeof globalAiStoreFactory>;
