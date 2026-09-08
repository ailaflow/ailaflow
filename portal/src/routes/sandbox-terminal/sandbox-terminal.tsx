import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { SandboxTerminalView } from '../../views/sandbox-terminal/sandbox-terminal-view';
import { useSandboxTerminalAi } from './sandbox-terminal-ai';
import { useSandboxTerminal } from './sandbox-terminal-context';

export function SandboxTerminal() {
  const state = useSandboxTerminal();

  useSandboxTerminalAi(state);

  return (
    <ResourceEditorView
      icon="+"
      name={state.sandbox.name}
      isNameReadOnly={true}
      isNameValid={true}
      viewSwitcherOptions={[
        { label: 'Editor', href: `/admin/sandboxes/${state.sandbox.name}` },
        { label: 'Terminal', href: `/admin/sandboxes/${state.sandbox.name}/terminal`, selected: true }
      ]}
      viewSwitcherDisabledReason={state.isExecuting ? 'Command in progress.' : undefined}
    >
      <SandboxTerminalView
        entries={state.entries}
        command={state.command}
        cwd={state.cwd}
        isExecuting={state.isExecuting}
        onCommandChange={state.setCommand}
        onSubmit={() => void state.executeCommand()}
      />
    </ResourceEditorView>
  );
}
