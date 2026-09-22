import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ToolCall, ToolDescriptor } from '@aibindkit/core';
import { AiBindingsStore } from '../core';
import { RouterAdapter } from './router-adapter';
import { ToolCallHandler } from './tool-call-handler';
import { UnsavedChangesController } from './unsaved-changes-controller';

export interface AiEnvironmentContext<Stores extends Record<string, AiBindingsStore>> {
  stores: Stores;
  unsavedChangesController: UnsavedChangesController;
  toolDescriptors: ToolDescriptor[];
  frontEndToolCallsHandler(signal: AbortSignal, toolCall: ToolCall): Promise<object | null>;
}

export interface AiEnvironmentProviderProps {
  children: React.ReactNode;
  routerAdapter: RouterAdapter;
}

export function aiEnvironment<Stores extends Record<string, AiBindingsStore>>(stores: Stores) {
  const context = createContext<AiEnvironmentContext<Stores> | null>(null);

  function Provider({ children, routerAdapter }: AiEnvironmentProviderProps) {
    const state = useMemo(() => {
      const unsavedChangesController = new UnsavedChangesController();
      const handler = new ToolCallHandler(stores, routerAdapter, unsavedChangesController);
      return {
        stores,
        unsavedChangesController,
        toolDescriptors: handler.toolDescriptors,
        frontEndToolCallsHandler: handler.frontEndToolCallsHandler
      };
    }, [routerAdapter]);

    return <context.Provider value={state}>{children}</context.Provider>;
  }

  function useAiEnvironment() {
    const env = useContext(context);
    if (!env) {
      throw new Error('Cannot locate AI environment');
    }
    return env;
  }

  function useAiStore<S extends keyof Stores>(storeName: S, bind: (store: Stores[S]) => void | (() => void), deps: unknown[]) {
    const env = useAiEnvironment();
    useEffect(() => bind(env.stores[storeName]), [env, storeName, ...deps]);
  }

  function useUnsavedChangesController(hasUnsavedChanges: boolean) {
    const env = useAiEnvironment();
    useEffect(() => {
      env.unsavedChangesController.setHasUnsavedChanges(hasUnsavedChanges);
      return () => env.unsavedChangesController.clear();
    }, [env, hasUnsavedChanges]);
  }

  return {
    stores,
    useAiEnvironment,
    useAiStore,
    useUnsavedChangesController,
    Provider
  };
}
