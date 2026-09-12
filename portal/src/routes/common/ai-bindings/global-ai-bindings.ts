import { global, globalStoreFactory } from '@aibindkit/react';

const g = global().tools({});

export const globalAiStoreFactory = globalStoreFactory(g);

export type GlobalAiBindingsStore = ReturnType<typeof globalAiStoreFactory>;
