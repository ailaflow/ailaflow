import type { ExecuteSandboxCommandUpdate, SandboxDto } from '@aila/model';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import type { SandboxTerminalEntry, SandboxTerminalEntryType } from '../../views/sandbox-terminal/sandbox-terminal-view';

export interface SandboxTerminalCommandResult {
  cwd: string;
  stdout: string;
  stderr: string;
  error: string | null;
  code: number | null;
  signal: string | null;
}

export interface SandboxTerminalState {
  sandbox: SandboxDto;
  entries: SandboxTerminalEntry[];
  command: string;
  cwd: string;
  isExecuting: boolean;
  setCommand(command: string): void;
  executeCommand(command?: string): Promise<SandboxTerminalCommandResult>;
}

const sandboxTerminalContext = createContext<SandboxTerminalState | null>(null);

export function useSandboxTerminal(): SandboxTerminalState {
  const context = useContext(sandboxTerminalContext);
  if (!context) {
    throw new Error('Cannot find sandbox terminal context');
  }
  return context;
}

export function SandboxTerminalContext(props: { sandbox: SandboxDto; children: React.ReactNode }) {
  const apiClient = useApiClient();
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

  async function executeCommand(commandOverride?: string): Promise<SandboxTerminalCommandResult> {
    const submittedCommand = commandOverride ?? command;
    if (executionAbortController.current) {
      throw new Error('A sandbox command is already running');
    }
    if (submittedCommand.trim().length === 0) {
      throw new Error('Sandbox command cannot be empty');
    }

    const submittedCwd = cwd;
    let resultCwd = submittedCwd;
    let stdout = '';
    let stderr = '';
    let executionError: string | null = null;
    let code: number | null = null;
    let signal: string | null = null;
    const cwdCapture = createCwdCapture(
      value => {
        resultCwd = value;
        setCwd(value);
      },
      text => {
        stdout += text;
        appendEntry('stdout', text);
      }
    );

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

    function handleUpdate(update: ExecuteSandboxCommandUpdate) {
      if (update.stderr) {
        stderr += update.stderr;
        appendEntry('stderr', update.stderr);
      }
      if (update.error) {
        executionError = update.error;
        appendEntry('error', `Error: ${update.error}\n`);
      }
      if (update.result) {
        code = update.result.code;
        signal = update.result.signal;
        const signalText = signal ? `, signal ${signal}` : '';
        appendEntry('result', `\n[Process exited with code ${code}${signalText}]\n`);
      }
    }

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
              executionError = error.message;
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
        executionError = error instanceof Error ? error.message : String(error);
        appendEntry('error', `Connection error: ${executionError}\n`);
      }
    } finally {
      if (executionAbortController.current === abortController) {
        executionAbortController.current = null;
        setIsExecuting(false);
      }
    }

    return { cwd: resultCwd, stdout, stderr, error: executionError, code, signal };
  }

  const state: SandboxTerminalState = {
    sandbox: props.sandbox,
    entries,
    command,
    cwd,
    isExecuting,
    setCommand,
    executeCommand
  };

  return <sandboxTerminalContext.Provider value={state}>{props.children}</sandboxTerminalContext.Provider>;
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
    wrapCommand(value) {
      return `trap 'printf "\\000${marker}%s\\000" "$PWD"' EXIT\n${value}`;
    },
    onStdout(value) {
      buffer += value;
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
