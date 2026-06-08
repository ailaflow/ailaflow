import { createContext, useContext, useState } from 'react';
import { AiBindingsStore } from './ai-bindings';
import { containerEditorAiBindingsFactory, ContainerEditorAiBindingsStore } from './container-editor-ai-bindings';

export interface AiBindingsContext {
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
    const containerEditor = containerEditorAiBindingsFactory();
    return {
      containerEditor,
      stores: [containerEditor]
    };
  });

  return <aiBindingsContext.Provider value={state}>{props.children}</aiBindingsContext.Provider>;
}
