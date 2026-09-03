import { useNavigate } from 'react-router-dom';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { SandboxTerminalView } from '../../views/sandbox-terminal/sandbox-terminal-view';
import { useSandboxTerminalAi } from './sandbox-terminal-ai';
import { useSandboxTerminal } from './sandbox-terminal-context';

export function SandboxTerminal() {
  const navigate = useNavigate();
  const state = useSandboxTerminal();

  useSandboxTerminalAi(state);

  return (
    <ResourceEditorView
      icon="+"
      name={state.sandbox.name}
      isNameReadOnly={true}
      isNameValid={true}
      canSwitch={true}
      switchLabel="Edit"
      onSwitch={() => navigate(`/admin/sandboxes/${encodeURIComponent(state.sandbox.name)}`)}
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
