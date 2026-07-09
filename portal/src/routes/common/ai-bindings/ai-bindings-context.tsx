import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AiBindingsStore, AiRoute } from './ai-bindings';
import { processEditorAiBindingsFactory, ProcessEditorAiBindingsStore } from './bindings/process-editor-ai-bindings';
import { sandboxEditorAiBindingsFactory, SandboxEditorAiBindingsStore } from './bindings/sandbox-editor-ai-bindings';
import { ProcessListAiBindingsStore, processListAiBindingsFactory } from './bindings/process-list-ai-bindings';
import { Location, matchRoutes, useLocation, useNavigate } from 'react-router';
import { routes } from '../../router';
import { ToolCall, ToolDescriptor } from '@aila/model';
import { sandboxListAiBindingsFactory, SandboxListAiBindingsStore } from './bindings/sandbox-list-ai-bindings';
import { isToolWait, toolError, toolSuccess } from './ai-tool-results';
import z from 'zod/v4';

export interface AiBindingsContext {
  stores: {
    sandboxList: SandboxListAiBindingsStore;
    sandboxEditor: SandboxEditorAiBindingsStore;
    processEditor: ProcessEditorAiBindingsStore;
    processList: ProcessListAiBindingsStore;
  };
  toolDescriptors: ToolDescriptor[];
  handleToolCall(abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null>;
}

const aiBindingsContext = createContext<AiBindingsContext | null>(null);

export function useAiBindings(): AiBindingsContext {
  const context = useContext(aiBindingsContext);
  if (!context) {
    throw new Error('Cannot locate AI bindings context');
  }
  return context;
}

export function useAiStore(fn: (stores: AiBindingsContext['stores']) => () => void, deps: unknown[]) {
  const { stores } = useAiBindings();
  useEffect(() => fn(stores), [stores, ...deps]);
}

function resolveCurrentRoute(location: Location) {
  const match = matchRoutes(routes, location)?.find(r => !r.route.children);
  return match && match.route.path
    ? {
        path: match.route.path,
        params: match.params
      }
    : null;
}

export function AiBindingsContextProvider(props: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoutePath = useRef<{
    path: string;
    params: Record<string, unknown>;
  } | null>(resolveCurrentRoute(location));

  useEffect(() => {
    currentRoutePath.current = resolveCurrentRoute(location);
  }, [location]);

  const state = useMemo(() => {
    const sandboxList = sandboxListAiBindingsFactory();
    const sandboxEditor = sandboxEditorAiBindingsFactory();
    const processEditor = processEditorAiBindingsFactory();
    const processList = processListAiBindingsFactory();
    const stores = {
      sandboxList,
      sandboxEditor,
      processEditor,
      processList
    };

    const toolDescriptors: ToolDescriptor[] = [];
    const routeByNameMap: Record<string, AiRoute> = {};
    const routeByPathMap: Record<string, AiRoute> = {};
    const functionMap: Record<
      string,
      {
        store: AiBindingsStore;
        zod?: z.ZodObject;
      }
    > = {};

    toolDescriptors.push({
      type: 'function',
      function: {
        name: 'getCurrentPage',
        description: 'Get the current route already opened in the browser'
      }
    });

    for (const store of Object.values(stores)) {
      if (store.route) {
        toolDescriptors.push({
          type: 'function',
          function: {
            name: `router_open_${store.route.name}`,
            description: `Opening the ${store.route.name} route`,
            parameters: store.route.argSchema
          }
        });
        routeByNameMap[store.route.name] = store.route;
        for (const path of store.route.paths) {
          routeByPathMap[path] = store.route;
        }
      }
      for (const binding of store.bindings) {
        toolDescriptors.push({
          type: 'function',
          function: binding.descriptor
        });
        functionMap[binding.descriptor.name] = {
          store,
          zod: binding.zod
        };
      }
    }

    return {
      stores,
      toolDescriptors,
      routeByNameMap,
      routeByPathMap,
      functionMap
    };
  }, []);

  const handleToolCall = useCallback(
    async (abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null> => {
      const arg = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'getCurrentPage') {
        const currentRoute = currentRoutePath.current ? state.routeByPathMap[currentRoutePath.current.path] : null;
        console.warn('Cannot determine current route', currentRoutePath.current);
        if (!currentRoute) {
          return { error: 'Cannot determine current route' };
        }
        return {
          name: currentRoute.name,
          params: currentRoutePath.current?.params ?? {}
        };
      }

      const routeName = toolCall.function.name.startsWith('router_open_') ? toolCall.function.name.substring(12) : null;
      const route = routeName ? state.routeByNameMap[routeName] : null;
      if (route) {
        let path = route.paths[0];
        for (const [key, value] of Object.entries(arg)) {
          path = path.replace(`:${key}`, String(value));
        }
        await navigate(path);
        console.log(`Redirected to ${routeName} (${path})`);
        return toolSuccess(`Redirected to ${routeName}`);
      }

      const fn = state.functionMap[toolCall.function.name];
      if (fn) {
        for (let attempt = 0; ; attempt++) {
          const setter = fn.store.tryGet();
          if (!setter) {
            return toolError(fn.store.route?.notAvailableMessage ?? 'Cannot find setter for the requested function');
          }
          if (fn.zod) {
            const parseResult = fn.zod.safeParse(arg);
            if (!parseResult.success) {
              return toolError(`Invalid arguments: ${parseResult.error.message}`);
            }
          }
          const result = await setter[toolCall.function.name](arg);
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

      return { error: 'Cannot find handler for the requested function' };
    },
    [state]
  );

  const context = useMemo(
    () => ({
      stores: state.stores,
      toolDescriptors: state.toolDescriptors,
      handleToolCall
    }),
    [state, handleToolCall]
  );

  return <aiBindingsContext.Provider value={context}>{props.children}</aiBindingsContext.Provider>;
}
