import type { ToolDescriptor } from '@aibindkit/model';
import z from 'zod/v4';
import { AiBinding } from './binding';
import { AiToolBuilder } from './tool';

export interface AiRoute<Params = void, Bindings extends readonly AiBinding[] = readonly AiBinding[]> {
  readonly __params?: Params;
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
  tools?: AiToolRecords;
}

type AiToolRecords = Record<string, AiToolBuilder<any>>;

type AiBindingFromTool<Name extends string, T> = T extends AiToolBuilder<infer Arg> ? AiBinding<Arg, Name> : never;

type AiBindingsFromTools<T extends AiToolRecords> = readonly {
  [K in keyof T & string]: AiBindingFromTool<K, T[K]>;
}[keyof T & string][];

export class AiRouteBuilder<Input = void, Bindings extends readonly AiBinding[] = []> {
  constructor(
    private readonly state: AiRouteBuilderState,
    private readonly bindings: Bindings
  ) {}

  public paths(paths: string[]): this {
    this.state.paths = paths;
    return this;
  }

  public unavailable(message: string): this {
    this.state.unavailableMessage = message;
    return this;
  }

  public params<S extends z.ZodObject>(params: S): AiRouteBuilder<z.infer<S>, Bindings> {
    this.state.params = params;
    return new AiRouteBuilder<z.infer<S>, Bindings>(this.state, this.bindings);
  }

  public tools<T extends AiToolRecords>(tools: T): AiRouteBuilder<Input, AiBindingsFromTools<T>> {
    const bindings = Object.entries(tools).map(([name, builder]) => builder.build(name)) as unknown as AiBindingsFromTools<T>;
    this.state.tools = tools;
    return new AiRouteBuilder<Input, AiBindingsFromTools<T>>(this.state, bindings);
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

export function route(name: string): AiRouteBuilder {
  return new AiRouteBuilder({ name }, []);
}
