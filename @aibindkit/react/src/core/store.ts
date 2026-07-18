import { AiBinding, AiBindingHandlers, AiGlobalBuilder } from './binding';
import { AiRouteBuilder, AiRoute } from './route';
import { toolError, toolWait } from './tool-result';

export class AiBindingsStore<Bindings extends readonly AiBinding[] = readonly AiBinding[], Params = any> {
  public readonly functionNames: Set<string>;
  private handlers: AiBindingHandlers<Bindings> | null = null;

  public constructor(
    public readonly bindings: Bindings,
    public readonly route?: AiRoute<Bindings, Params>
  ) {
    this.functionNames = new Set(bindings.map(b => b.name));
  }

  public tryGet(): AiBindingHandlers<Bindings> | null {
    return this.handlers;
  }

  public bind(newHandlers: AiBindingHandlers<Bindings>) {
    this.handlers = newHandlers;
    return () => {
      this.handlers = null;
    };
  }

  public bindWait(finishSignal: AbortSignal) {
    const handlers: AiBindingHandlers<any> = {};
    for (const binding of this.bindings) {
      handlers[binding.name] = async () => toolWait(finishSignal);
    }
    return this.bind(handlers as AiBindingHandlers<Bindings>);
  }

  public bindError(error: string | Error) {
    const handlers: AiBindingHandlers<any> = {};
    for (const binding of this.bindings) {
      handlers[binding.name] = async () => toolError(error);
    }
    return this.bind(handlers as AiBindingHandlers<Bindings>);
  }
}

export function globalStoreFactory<Bindings extends readonly AiBinding[]>(
  builder: AiGlobalBuilder<Bindings>
): () => AiBindingsStore<Bindings, void> {
  const bindings = builder.build();
  return () => new AiBindingsStore(bindings);
}

export function routeStoreFactory<Params, Bindings extends readonly AiBinding[]>(
  builder: AiRouteBuilder<Params, Bindings>
): () => AiBindingsStore<Bindings, Params> {
  const route = builder.build();
  return () => new AiBindingsStore(route.bindings, route);
}
