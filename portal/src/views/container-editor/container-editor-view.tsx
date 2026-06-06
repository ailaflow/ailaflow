import { DockerfileContent } from '@aila/model';
import { useLayoutEffect, useRef } from 'react';

export interface ContainerEditorViewProps {
  isEnabled: boolean;
  description: string;
  configuration: string;
  onIsEnabledChange(isEnabled: boolean): void;
  onDescriptionChange(description: string): void;
  onConfigurationChange(configuration: string): void;
}

export function ContainerEditorView(props: ContainerEditorViewProps) {
  const configurationTextareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = configurationTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [props.configuration]);

  return (
    <div className="h-full overflow-auto p-5">
      <div className="grid h-full min-h-[520px] grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Is container enabled</span>
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

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={props.description}
              onChange={e => props.onDescriptionChange(e.target.value)}
              className="h-36 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
        </div>

        <label className="flex min-h-0 flex-col">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Configuration</span>
          <div className="max-h-[calc(100dvh-14rem)] min-h-[360px] flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-md border border-slate-200 bg-slate-50 transition-colors focus-within:border-slate-400">
            <pre className="whitespace-pre-wrap break-words border-b border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-500">
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
            <pre className="whitespace-pre-wrap break-words border-t border-slate-100 bg-slate-50 px-3 py-2 font-mono text-sm leading-6 text-slate-500">
              {DockerfileContent.suffix}
            </pre>
          </div>
        </label>
      </div>
    </div>
  );
}
