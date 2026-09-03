import { route, routeStoreFactory, tool } from '@aibindkit/react';
import * as z from 'zod/v4';

const processTesterRoute = route('processTester')
  .paths(['/admin/processes/:processName/test'])
  .unavailable('You are not on a process tester page.')
  .params(
    z.object({
      processName: z.string().describe('Name of the process to test')
    })
  )
  .tools({
    getTimeline: tool('Get the process test execution timeline')
  });

export const processTesterAiStoreFactory = routeStoreFactory(processTesterRoute);

export type ProcessTesterAiStore = ReturnType<typeof processTesterAiStoreFactory>;
