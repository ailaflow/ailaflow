import { toolError } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import type { SandboxTerminalState } from './sandbox-terminal-context';
import { SandboxTerminalAccess } from '@ailaflow/shared';

export function useSandboxTerminalAi(state: SandboxTerminalState) {
  useAiStore(
    'sandboxTerminal',
    store =>
      store.bind({
        async getEntries() {
          state.assertTerminalAccess(SandboxTerminalAccess.PORTAL_AND_ADMIN_ASSISTANT);

          return { entries: state.entries };
        },
        async executeCommand(arg) {
          state.assertTerminalAccess(SandboxTerminalAccess.PORTAL_AND_ADMIN_ASSISTANT);

          try {
            return await state.executeCommand(arg.command);
          } catch (error) {
            return toolError(error instanceof Error ? error : String(error));
          }
        }
      }),
    [state]
  );
}
