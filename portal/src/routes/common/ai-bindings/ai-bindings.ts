import { ToolDescriptor } from '@aila/model';
import z from 'zod/v4';
import { toolError, toolWait } from './ai-tool-results';

export interface AiBinding<Input = any, Name extends string = string> {
  readonly __input?: Input;
  zod?: z.ZodObject;
  name: Name;
  description: string;
  parameters?: ToolDescriptor['function']['parameters'];
}

interface ToolBuilderState {
  description: string;
  zod?: z.ZodObject;
}

export class ToolBuilder<Input = any> {
  declare private readonly __input?: Input;

  public constructor(private readonly state: ToolBuilderState) {}

  public input<S extends z.ZodObject>(zod: S): ToolBuilder<z.infer<S>> {
    this.state.zod = zod;
    return new ToolBuilder<z.infer<S>>(this.state);
  }

  public build<Name extends string>(name: Name): AiBinding<Input, Name> {
    return {
      zod: this.state.zod,
      name,
      description: this.state.description,
      parameters: this.state.zod?.toJSONSchema()
    };
  }
}

export function tool(description: string): ToolBuilder {
  return new ToolBuilder({ description });
}

export interface AiRoute<_Input = void, Bindings extends readonly AiBinding[] = readonly AiBinding[]> {
  name: string;
  paths: string[];
  notAvailableMessage: string;
  paramsSchema?: ToolDescriptor['function']['parameters'];
  bindings: Bindings;
}

interface AiRouteBuilderState {
  name: string;
  paths?: string[];
  unavailableMessage?: string;
  params?: z.ZodObject;
  tools?: ToolRecord;
}

type ToolRecord = Record<string, ToolBuilder<any>>;

type BindingFromTool<Name extends string, T> = T extends ToolBuilder<infer Arg> ? AiBinding<Arg, Name> : never;

type BindingsFromTools<T extends ToolRecord> = readonly {
  [K in keyof T & string]: BindingFromTool<K, T[K]>;
}[keyof T & string][];

export class AiRouteBuilder<Input = void, Bindings extends readonly AiBinding[] = []> {
  constructor(
    private readonly state: AiRouteBuilderState,
    private readonly bindings: Bindings
  ) {}

  public paths(paths: string[]): AiRouteBuilder<Input, Bindings> {
    this.state.paths = paths;
    return this;
  }

  public unavailable(message: string): AiRouteBuilder<Input, Bindings> {
    this.state.unavailableMessage = message;
    return this;
  }

  public params<S extends z.ZodObject>(params: S): AiRouteBuilder<z.infer<S>, Bindings> {
    this.state.params = params;
    return new AiRouteBuilder<z.infer<S>, Bindings>(this.state, this.bindings);
  }

  public tools<T extends ToolRecord>(tools: T): AiRouteBuilder<Input, BindingsFromTools<T>> {
    const bindings = Object.entries(tools).map(([name, builder]) => builder.build(name)) as unknown as BindingsFromTools<T>;
    this.state.tools = tools;
    return new AiRouteBuilder<Input, BindingsFromTools<T>>(this.state, bindings);
  }

  public build(): AiRoute<Input, Bindings> {
    if (!this.state.paths) {
      throw new Error('Paths must be set');
    }
    if (!this.state.unavailableMessage) {
      throw new Error('Unavailable message must be set');
    }
    return {
      name: this.state.name,
      paths: this.state.paths,
      notAvailableMessage: this.state.unavailableMessage,
      paramsSchema: this.state.params?.toJSONSchema(),
      bindings: this.bindings
    };
  }
}

export function aiRoute(name: string): AiRouteBuilder {
  return new AiRouteBuilder({ name }, []);
}

export type AiSetter<Bindings extends readonly AiBinding[]> = {
  [Binding in Bindings[number] as Binding['name']]: (arg: Binding extends AiBinding<infer Arg, string> ? Arg : never) => Promise<object>;
};

export interface AiBindingsStore<Bindings extends readonly AiBinding[] = readonly AiBinding[], RouteArg = any> {
  readonly bindings: Bindings;
  readonly functionNames: Set<string>;
  readonly route?: AiRoute<RouteArg, Bindings>;
  tryGet(): AiSetter<Bindings> | null;
  bind(setter: AiSetter<Bindings>): () => void;
  bindWait(finishSignal: AbortSignal): () => void;
  bindError(error: string | Error): () => void;
}

export function storeFactoryFromRoute<Params, Bindings extends readonly AiBinding[]>(
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
