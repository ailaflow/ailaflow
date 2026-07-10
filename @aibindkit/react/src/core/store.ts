import { AiBinding, AiSetter } from './binding';
import { AiRouteBuilder, AiRoute } from './route';
import { toolError, toolWait } from './tool-result';

export interface AiBindingsStore<Bindings extends readonly AiBinding[] = readonly AiBinding[], Params = any> {
  readonly bindings: Bindings;
  readonly functionNames: Set<string>;
  readonly route?: AiRoute<Params, Bindings>;
  tryGet(): AiSetter<Bindings> | null;
  bind(setter: AiSetter<Bindings>): () => void;
  bindWait(finishSignal: AbortSignal): () => void;
  bindError(error: string | Error): () => void;
}

export function storeFactory<Params, Bindings extends readonly AiBinding[]>(
  builder: AiRouteBuilder<Params, Bindings>
): () => AiBindingsStore<Bindings, Params> {
  const route = builder.build();
  return () => {
    let setter: AiSetter<Bindings> | null = null;
    return {
      bindings: route.bindings,
      functionNames: new Set(route.bindings.map(b => b.name)),
      route,
      tryGet() {
        return setter;
      },
      bind(newSetter: AiSetter<Bindings>) {
        setter = newSetter;
        return () => {
          setter = null;
        };
      },
      bindWait(finishSignal: AbortSignal) {
        const setter: AiSetter<any> = {};
        for (const binding of route.bindings) {
          setter[binding.name] = async () => toolWait(finishSignal);
        }
        return this.bind(setter as AiSetter<Bindings>);
      },
      bindError(error: string | Error) {
        const setter: AiSetter<any> = {};
        for (const binding of route.bindings) {
          setter[binding.name] = async () => toolError(error);
        }
        return this.bind(setter as AiSetter<Bindings>);
      }
    };
  };
}
