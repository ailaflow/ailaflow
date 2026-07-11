import { route, storeFactory, tool } from '@aibindkit/react';

const sandboxListRoute = route('sandboxList')
  .paths(['/admin/sandboxes'])
  .unavailable('You are not on a sandbox list page.')
  .tools({
    getSandboxes: tool('Get all created sandboxes.'),
    createNew: tool('Open a form to create a new sandbox.')
  });

export const sandboxListAiStoreFactory = storeFactory(sandboxListRoute);

export type SandboxListAiStore = ReturnType<typeof sandboxListAiStoreFactory>;
