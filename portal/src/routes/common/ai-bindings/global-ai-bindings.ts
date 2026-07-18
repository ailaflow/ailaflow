import { global, globalStoreFactory, tool } from '@aibindkit/react';

const g = global().tools({
  getCurrentUser: tool('Get the current user ID and email')
});

export const globalAiStoreFactory = globalStoreFactory(g);

export type GlobalAiBindingsStore = ReturnType<typeof globalAiStoreFactory>;
