import { createContext, useContext, useEffect, useMemo } from 'react';
import type { ToolCall, ToolDescriptor } from '@aibindkit/model';
import { AiBinding, AiBindingsStore, AiRoute, isToolWait, toolError, toolSuccess } from '../core';
import { RouterAdapter } from './router-adapter';

export interface AiEnvironmentContext<Stores extends Record<string, AiBindingsStore>> {
  stores: Stores;
  toolDescriptors: ToolDescriptor[];
  handleToolCall(abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null>;
}

export interface AiEnvironmentProviderProps {
  children: React.ReactNode;
  routerAdapter: RouterAdapter;
}

export function aiEnvironment<Stores extends Record<string, AiBindingsStore>>(stores: Stores) {
  const context = createContext<AiEnvironmentContext<Stores> | null>(null);

  function Provider({ children, routerAdapter }: AiEnvironmentProviderProps) {
    const state = useMemo(() => {
      const toolDescriptors: ToolDescriptor[] = [];
      const routeByNameMap: Record<string, AiRoute> = {};
      const routeByPathMap: Record<string, AiRoute> = {};
      const functionMap: Record<
        string,
        {
          store: AiBindingsStore;
          binding: AiBinding;
        }
      > = {};

      toolDescriptors.push({
        type: 'function',
        function: {
          name: 'router_getCurrentRoute',
          description: 'Get the current route already opened in the browser'
        }
      });

      for (const store of Object.values(stores)) {
        if (store.route) {
          const name = `router_open_${store.route.name}`;
          toolDescriptors.push({
            type: 'function',
            function: {
              name,
              description: `Opening the \`${store.route.name}\` route`,
              parameters: store.route.paramsSchema
            }
          });
          routeByNameMap[name] = store.route;
          for (const path of store.route.paths) {
            routeByPathMap[path] = store.route;
          }
        }
        for (const binding of store.bindings) {
          const name = store.route ? `${store.route.name}_${binding.name}` : binding.name;
          toolDescriptors.push({
            type: 'function',
            function: {
              name,
              description: binding.description,
              parameters: binding.parameters
            }
          });
          functionMap[name] = {
            store,
            binding
          };
        }
      }

      async function handleToolCall(abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null> {
        const arg = JSON.parse(toolCall.function.arguments);

        if (toolCall.function.name === 'router_getCurrentRoute') {
          const current = routerAdapter.getCurrentRoute();
          const route = current ? routeByPathMap[current.path] : null;
          if (!current || !route) {
            return toolError('Cannot determine current route');
          }
          return {
            name: route.name,
            params: current.params
          };
        }

        const route = routeByNameMap[toolCall.function.name];
        if (route) {
          let path = route.paths[0];
          for (const [key, value] of Object.entries(arg)) {
            path = path.replace(`:${key}`, String(value));
          }
          await routerAdapter.navigate(path);
          return toolSuccess(`Redirected to ${route.name}`);
        }

        const fn = functionMap[toolCall.function.name];
        if (fn) {
          for (let attempt = 0; ; attempt++) {
            const setter = fn.store.tryGet();
            if (!setter) {
              return toolError(fn.store.route?.notAvailableMessage ?? 'Cannot find setter for the requested function');
            }
            if (fn.binding.zod) {
              const parseResult = fn.binding.zod.safeParse(arg);
              if (!parseResult.success) {
                return toolError(`Invalid arguments: ${parseResult.error.message}`);
              }
            }
            const result = await setter[fn.binding.name](arg);
            if (isToolWait(result)) {
              if (attempt === 0) {
                await result.wait(abortSignal);
                continue;
              } else {
                return toolError('The resource is still loading, please try again later.');
              }
            }
            return result;
          }
        }

        return toolError('Cannot find handler for the requested function');
      }

      return {
        stores,
        toolDescriptors,
        handleToolCall
      };
    }, [routerAdapter]);

    return <context.Provider value={state}>{children}</context.Provider>;
  }

  function useAiEnvironment() {
    const c = useContext(context);
    if (!c) {
      throw new Error('Cannot locate AI bindings context');
    }
    return c;
  }

  function useAiStore<S extends keyof Stores>(storeName: S, bind: (store: Stores[S]) => void | (() => void), deps: unknown[]) {
    const c = useAiEnvironment();
    useEffect(() => bind(c.stores[storeName]), [c, storeName, ...deps]);
  }

  return {
    stores,
    useAiEnvironment,
    useAiStore,
    Provider
  };
}
