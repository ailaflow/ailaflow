import { toolError } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import type { SandboxTerminalState } from './sandbox-terminal-context';

export function useSandboxTerminalAi(state: SandboxTerminalState) {
  useAiStore(
    'sandboxTerminal',
    store =>
      store.bind({
        async getEntries() {
          return { entries: state.entries };
        },
        async executeCommand(arg) {
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
