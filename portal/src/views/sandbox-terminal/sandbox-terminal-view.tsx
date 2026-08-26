import { useEffect, useRef } from 'react';

export type SandboxTerminalEntryType = 'command' | 'stdout' | 'stderr' | 'error' | 'result';

export interface SandboxTerminalEntry {
  id: number;
  type: SandboxTerminalEntryType;
  text: string;
}

export interface SandboxTerminalViewProps {
  entries: SandboxTerminalEntry[];
  command: string;
  cwd: string;
  isExecuting: boolean;
  onCommandChange(command: string): void;
  onSubmit(): void;
}

export function SandboxTerminalView(props: SandboxTerminalViewProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const output = outputRef.current;
    if (output) {
      output.scrollTop = output.scrollHeight;
    }
  }, [props.entries]);

  useEffect(() => {
    if (!props.isExecuting) {
      commandInputRef.current?.focus();
    }
  }, [props.isExecuting]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      <div ref={outputRef} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
        <div className="mb-4 rounded-md border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs leading-5 text-sky-100">
          <span className="font-semibold text-sky-300">Note:</span> Each command runs in a fresh shell. The working directory shown in the
          prompt is carried forward, but environment variables and other shell state are not preserved between commands.
        </div>

        {props.entries.length === 0 ? (
          <p className="font-mono text-[13px] text-slate-500">Command output will appear here.</p>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-5 text-slate-200">
            {props.entries.map(entry => (
              <span key={entry.id} className={getEntryClassName(entry.type)}>
                {entry.text}
              </span>
            ))}
          </pre>
        )}

        {props.isExecuting ? (
          <div className="mt-3 flex items-center gap-2 font-mono text-xs text-amber-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
            Running command…
          </div>
        ) : null}
      </div>

      <form
        className="shrink-0 border-t border-slate-700 bg-slate-900 px-4 py-3 sm:px-5"
        onSubmit={event => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 transition-colors focus-within:border-sky-500">
          <span
            aria-hidden="true"
            title={props.cwd}
            className="max-w-[45%] shrink-0 truncate font-mono text-[13px] font-semibold text-emerald-400"
          >
            {props.cwd} $
          </span>
          <input
            ref={commandInputRef}
            type="text"
            autoComplete="off"
            autoFocus
            spellCheck={false}
            aria-label="Sandbox command"
            placeholder={props.isExecuting ? 'Waiting for the current command…' : 'Enter a command'}
            value={props.command}
            disabled={props.isExecuting}
            onChange={event => props.onCommandChange(event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[13px] text-slate-100 outline-none placeholder:text-slate-600 disabled:cursor-wait disabled:text-slate-500"
          />
          <button
            type="submit"
            disabled={props.isExecuting || props.command.trim().length === 0}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-sky-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {props.isExecuting ? 'Running' : 'Run'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getEntryClassName(type: SandboxTerminalEntryType): string {
  switch (type) {
    case 'command':
      return 'font-semibold text-emerald-300';
    case 'stderr':
      return 'text-amber-300';
    case 'error':
      return 'text-red-400';
    case 'result':
      return 'text-slate-500';
    default:
      return 'text-slate-200';
  }
}
