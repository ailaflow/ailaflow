import { route, routeStoreFactory, tool } from '@aibindkit/react';
import * as z from 'zod/v4';

const sandboxTerminalRoute = route('sandboxTerminal')
  .paths(['/admin/sandboxes/:name/terminal'])
  .unavailable('You are not on a sandbox terminal page.')
  .params(
    z.object({
      name: z.string().describe('Name of the sandbox whose terminal should be opened')
    })
  )
  .tools({
    getEntries: tool('Get the visible sandbox terminal history'),
    executeCommand: tool('Execute a command in the sandbox at the current working directory').input(
      z.object({
        command: z.string().min(1).describe('Shell command to execute')
      })
    )
  });

export const sandboxTerminalAiStoreFactory = routeStoreFactory(sandboxTerminalRoute);

export type SandboxTerminalAiStore = ReturnType<typeof sandboxTerminalAiStoreFactory>;
