import { DockerfileContent } from '@aila/model';
import { useLayoutEffect, useRef, useState } from 'react';
import { SvgIcon } from '../common/svg-icons';

export interface SandboxSecret {
  id: number;
  key: string;
  value: string;
}

export interface SandboxEditorViewProps {
  isEnabled: boolean;
  configuration: string;
  secrets: SandboxSecret[];
  onIsEnabledChange(isEnabled: boolean): void;
  onConfigurationChange(configuration: string): void;
  onSecretAdd(): void;
  onSecretRemove(id: number): void;
  onSecretKeyChange(id: number, key: string): void;
  onSecretValueChange(id: number, value: string): void;
}

export function SandboxEditorView(props: SandboxEditorViewProps) {
  const configurationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [visibleSecretValueIds, setVisibleSecretValueIds] = useState<Set<number>>(() => new Set());

  useLayoutEffect(() => {
    const textarea = configurationTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [props.configuration]);

  function isSecretValueVisible(id: number): boolean {
    return visibleSecretValueIds.has(id);
  }

  function toggleSecretValueVisibility(id: number) {
    setVisibleSecretValueIds(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function removeSecret(id: number) {
    props.onSecretRemove(id);
    setVisibleSecretValueIds(current => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="h-full overflow-auto p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Is sandbox enabled</span>
          <button
            type="button"
            role="switch"
            aria-checked={props.isEnabled}
            onClick={() => props.onIsEnabledChange(!props.isEnabled)}
            className="inline-flex h-9 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span
              className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                props.isEnabled ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white transition-transform ${props.isEnabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </span>
            <span>{props.isEnabled ? 'True' : 'False'}</span>
          </button>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="block text-sm font-medium text-slate-700">Secrets</span>
            <button
              type="button"
              onClick={props.onSecretAdd}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Add secret
            </button>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-160 w-full table-fixed divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="w-[36%] px-3 py-2.5 font-semibold text-slate-600">
                    Key
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold text-slate-600">
                    Value
                  </th>
                  <th scope="col" className="w-14 px-3 py-2.5 text-right font-semibold text-slate-600">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {props.secrets.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-sm text-slate-500">
                      No secrets
                    </td>
                  </tr>
                ) : (
                  props.secrets.map(secret => (
                    <tr key={secret.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={secret.key}
                          onChange={e => props.onSecretKeyChange(secret.id, e.target.value)}
                          className="h-9 w-full rounded-md border border-slate-200 px-2.5 font-mono text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
                          placeholder="KEY_NAME"
                          spellCheck={false}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex h-9 overflow-hidden rounded-md border border-slate-200 transition-colors focus-within:border-slate-400">
                          <input
                            type={isSecretValueVisible(secret.id) ? 'text' : 'password'}
                            value={secret.value}
                            onChange={e => props.onSecretValueChange(secret.id, e.target.value)}
                            className="min-w-0 flex-1 border-0 px-2.5 font-mono text-sm text-slate-900 outline-none placeholder:text-slate-400"
                            placeholder="value"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            aria-label={`${isSecretValueVisible(secret.id) ? 'Hide' : 'Show'} ${secret.key || 'secret'} value`}
                            onClick={() => toggleSecretValueVisibility(secret.id)}
                            className="inline-flex h-full w-9 shrink-0 items-center justify-center border-l border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                          >
                            {isSecretValueVisible(secret.id) ? (
                              <SvgIcon name="eyeClosed" className="h-4 w-4" />
                            ) : (
                              <SvgIcon name="eyeOpen" className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${secret.key || 'secret'}`}
                          onClick={() => removeSecret(secret.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                          <SvgIcon name="x" className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <label className="flex min-h-0 flex-col">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Configuration</span>
          <div className="max-h-[calc(100dvh-14rem)] min-h-90 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border border-slate-200 bg-slate-50 transition-colors focus-within:border-slate-400">
            <pre className="whitespace-pre-wrap wrap-break-word border-b border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-500">
              {DockerfileContent.prefix}
            </pre>
            <textarea
              ref={configurationTextareaRef}
              value={props.configuration}
              onChange={e => props.onConfigurationChange(e.target.value)}
              className="block min-h-10 w-full resize-none overflow-y-hidden overflow-x-hidden border-0 bg-white px-3 py-2 font-mono text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
              spellCheck={false}
              wrap="soft"
            />
            <pre className="whitespace-pre-wrap wrap-break-word border-t border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-500">
              {DockerfileContent.suffix}
            </pre>
          </div>
        </label>
      </div>
    </div>
  );
}
