import { createContext, useContext, useState } from 'react';
import { AiBindingsStore } from './ai-bindings';
import { sandboxEditorAiBindingsFactory, SandboxEditorAiBindingsStore } from './sandbox-editor-ai-bindings';
import { globalAiBindingsFactory, GlobalAiBindingsStore } from './global-ai-bindings';

export interface AiBindingsContext {
  global: GlobalAiBindingsStore;
  sandboxEditor: SandboxEditorAiBindingsStore;
  stores: AiBindingsStore[];
}

const aiBindingsContext = createContext<AiBindingsContext | null>(null);

export function useAiBindings(): AiBindingsContext {
  const context = useContext(aiBindingsContext);
  if (!context) {
    throw new Error('Cannot locate AI bindings context');
  }
  return context;
}

export function AiBindingsContextProvider(props: { children: React.ReactNode }) {
  const [state] = useState<AiBindingsContext>(() => {
    const global = globalAiBindingsFactory();
    const sandboxEditor = sandboxEditorAiBindingsFactory();
    return {
      global,
      sandboxEditor,
      stores: [global, sandboxEditor]
    };
  });

  return <aiBindingsContext.Provider value={state}>{props.children}</aiBindingsContext.Provider>;
}
