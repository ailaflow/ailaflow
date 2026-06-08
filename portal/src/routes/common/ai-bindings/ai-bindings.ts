import { ToolDescriptor } from '@aila/model';

export function buildAiBinding<Name extends string>(name: Name) {
  return {
    arg<Arg>(descriptor: Omit<ToolDescriptor['function'], 'name'>): AiBinding<Arg, Name> {
      return {
        descriptor: {
          ...descriptor,
          name
        }
      };
    }
  };
}

export interface AiBinding<_Arg, Name extends string> {
  descriptor: ToolDescriptor['function'] & {
    name: Name;
  };
}

export type AiSetter<Bindings extends readonly AiBinding<any, string>[]> = {
  [Binding in Bindings[number] as Binding['descriptor']['name']]: (
    arg: Binding extends AiBinding<infer Arg, string> ? Arg : never
  ) => Promise<object>;
};

export interface AiBindingsStore<Bindings extends readonly AiBinding<any, string>[] = readonly AiBinding<any, string>[]> {
  readonly bindings: Bindings;
  readonly functionNames: Set<string>;
  readonly notAvailableMessage: string;
  tryGet(): AiSetter<Bindings> | null;
  bind(setter: AiSetter<Bindings>): () => void;
}

export function buildAiBindingStoreFactory<Bindings extends readonly AiBinding<any, string>[]>(
  bindings: Bindings,
  notAvailableMessage: string
): () => AiBindingsStore<Bindings> {
  return () => {
    let setter: AiSetter<Bindings> | null = null;
    return {
      bindings,
      functionNames: new Set(bindings.map(b => b.descriptor.name)),
      notAvailableMessage,
      tryGet() {
        return setter;
      },
      bind(newSetter: AiSetter<Bindings>) {
        setter = newSetter;
        return () => {
          setter = null;
        };
      }
    };
  };
}
