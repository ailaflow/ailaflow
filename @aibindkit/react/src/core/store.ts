import { AiBinding, AiBindingHandlers } from './binding';
import { AiRouteBuilder, AiRoute } from './route';
import { toolError, toolWait } from './tool-result';

export interface AiBindingsStore<Bindings extends readonly AiBinding[] = readonly AiBinding[], Params = any> {
  readonly bindings: Bindings;
  readonly functionNames: Set<string>;
  readonly route?: AiRoute<Params, Bindings>;
  tryGet(): AiBindingHandlers<Bindings> | null;
  bind(handlers: AiBindingHandlers<Bindings>): () => void;
  bindWait(finishSignal: AbortSignal): () => void;
  bindError(error: string | Error): () => void;
}

export function storeFactory<Params, Bindings extends readonly AiBinding[]>(
  builder: AiRouteBuilder<Params, Bindings>
): () => AiBindingsStore<Bindings, Params> {
  const route = builder.build();
  return () => {
    let handlers: AiBindingHandlers<Bindings> | null = null;
    return {
      bindings: route.bindings,
      functionNames: new Set(route.bindings.map(b => b.name)),
      route,
      tryGet() {
        return handlers;
      },
      bind(newHandlers: AiBindingHandlers<Bindings>) {
        handlers = newHandlers;
        return () => {
          handlers = null;
        };
      },
      bindWait(finishSignal: AbortSignal) {
        const handlers: AiBindingHandlers<any> = {};
        for (const binding of route.bindings) {
          handlers[binding.name] = async () => toolWait(finishSignal);
        }
        return this.bind(handlers as AiBindingHandlers<Bindings>);
      },
      bindError(error: string | Error) {
        const handlers: AiBindingHandlers<any> = {};
        for (const binding of route.bindings) {
          handlers[binding.name] = async () => toolError(error);
        }
        return this.bind(handlers as AiBindingHandlers<Bindings>);
      }
    };
  };
}
