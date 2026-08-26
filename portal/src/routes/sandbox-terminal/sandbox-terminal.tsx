import type { ExecuteSandboxCommandUpdate, SandboxDto } from '@aila/model';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import {
  type SandboxTerminalEntry,
  type SandboxTerminalEntryType,
  SandboxTerminalView
} from '../../views/sandbox-terminal/sandbox-terminal-view';

export function SandboxTerminal(props: { sandbox: SandboxDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SandboxTerminalEntry[]>([]);
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState('/app');
  const [isExecuting, setIsExecuting] = useState(false);
  const nextEntryId = useRef(0);
  const executionAbortController = useRef<AbortController | null>(null);

  useEffect(() => () => executionAbortController.current?.abort(), []);

  function appendEntry(type: SandboxTerminalEntryType, text: string) {
    setEntries(current => [...current, { id: nextEntryId.current++, type, text }]);
  }

  function handleUpdate(update: ExecuteSandboxCommandUpdate) {
    if (update.stderr) {
      appendEntry('stderr', update.stderr);
    }
    if (update.error) {
      appendEntry('error', `Error: ${update.error}\n`);
    }
    if (update.result) {
      const signal = update.result.signal ? `, signal ${update.result.signal}` : '';
      appendEntry('result', `\n[Process exited with code ${update.result.code}${signal}]\n`);
    }
  }

  async function executeCommand() {
    if (isExecuting || command.trim().length === 0) {
      return;
    }

    const submittedCommand = command;
    const submittedCwd = cwd;
    const cwdCapture = createCwdCapture(setCwd, text => appendEntry('stdout', text));
    setEntries(current => [
      ...current,
      {
        id: nextEntryId.current++,
        type: 'command',
        text: `${current.length > 0 ? '\n' : ''}${submittedCwd} $ ${submittedCommand}\n`
      }
    ]);
    setCommand('');
    setIsExecuting(true);

    const abortController = new AbortController();
    executionAbortController.current = abortController;

    try {
      await apiClient.sandbox.executeCommand(
        abortController.signal,
        {
          onMessage: update => {
            if (update.stdout) {
              cwdCapture.onStdout(update.stdout);
            }
            if (update.result) {
              cwdCapture.flush();
            }
            handleUpdate(update);
          },
          onClose: error => {
            cwdCapture.flush();
            if (error && !abortController.signal.aborted) {
              appendEntry('error', `Connection error: ${error.message}\n`);
            }
          }
        },
        props.sandbox.name,
        { cwd: submittedCwd, command: cwdCapture.wrapCommand(submittedCommand) }
      );
    } catch (error) {
      cwdCapture.flush();
      if (!abortController.signal.aborted) {
        appendEntry('error', `Connection error: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    } finally {
      if (executionAbortController.current === abortController) {
        executionAbortController.current = null;
        setIsExecuting(false);
      }
    }
  }

  return (
    <ResourceEditorView
      icon="+"
      name={props.sandbox.name}
      isNameReadOnly={true}
      isNameValid={true}
      canSwitch={true}
      switchLabel="Edit"
      onSwitch={() => navigate(`/admin/sandboxes/${encodeURIComponent(props.sandbox.name)}`)}
    >
      <SandboxTerminalView
        entries={entries}
        command={command}
        cwd={cwd}
        isExecuting={isExecuting}
        onCommandChange={setCommand}
        onSubmit={() => void executeCommand()}
      />
    </ResourceEditorView>
  );
}

interface CwdCapture {
  wrapCommand(command: string): string;
  onStdout(stdout: string): void;
  flush(): void;
}

function createCwdCapture(onCwd: (cwd: string) => void, onStdout: (stdout: string) => void): CwdCapture {
  const marker = `AILA_CWD_${crypto.randomUUID()}:`;
  const prefix = `\0${marker}`;
  const suffix = '\0';
  let buffer = '';

  function drain(isFinal: boolean) {
    const markerStart = buffer.indexOf(prefix);
    if (markerStart !== -1) {
      if (markerStart > 0) {
        onStdout(buffer.slice(0, markerStart));
      }

      const cwdStart = markerStart + prefix.length;
      const markerEnd = buffer.indexOf(suffix, cwdStart);
      if (markerEnd === -1) {
        buffer = buffer.slice(markerStart);
        if (isFinal) {
          buffer = '';
        }
        return;
      }

      onCwd(buffer.slice(cwdStart, markerEnd));
      buffer = buffer.slice(markerEnd + suffix.length);
    }

    if (isFinal) {
      if (buffer) {
        onStdout(buffer);
        buffer = '';
      }
      return;
    }

    const partialMarkerLength = getPartialMarkerLength(buffer, prefix);
    const safeLength = buffer.length - partialMarkerLength;
    if (safeLength > 0) {
      onStdout(buffer.slice(0, safeLength));
      buffer = buffer.slice(safeLength);
    }
  }

  return {
    wrapCommand(command) {
      return `trap 'printf "\\000${marker}%s\\000" "$PWD"' EXIT\n${command}`;
    },
    onStdout(stdout) {
      buffer += stdout;
      drain(false);
    },
    flush() {
      drain(true);
    }
  };
}

function getPartialMarkerLength(value: string, marker: string): number {
  for (let length = Math.min(value.length, marker.length - 1); length > 0; length--) {
    if (value.endsWith(marker.slice(0, length))) {
      return length;
    }
  }
  return 0;
}
