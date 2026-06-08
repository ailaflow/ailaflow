import { createContext, useContext, useState } from 'react';
import { AiBindingsStore } from './ai-bindings';
import { containerEditorAiBindingsFactory, ContainerEditorAiBindingsStore } from './container-editor-ai-bindings';
import { globalAiBindingsFactory, GlobalAiBindingsStore } from './global-ai-bindings';

export interface AiBindingsContext {
  global: GlobalAiBindingsStore;
  containerEditor: ContainerEditorAiBindingsStore;
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
    const containerEditor = containerEditorAiBindingsFactory();
    return {
      global,
      containerEditor,
      stores: [global, containerEditor]
    };
  });

  return <aiBindingsContext.Provider value={state}>{props.children}</aiBindingsContext.Provider>;
}
