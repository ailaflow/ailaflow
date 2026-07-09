import { ToolDescriptor } from '@aila/model';
import z from 'zod/v4';
import { toolError, toolWait } from './ai-tool-results';
import type { JSONSchema } from 'zod/v4/core';

export function aiBinding<Name extends string>(name: Name, description: string) {
  return {
    arg<S extends z.ZodObject>(zod: S, override?: (jsonSchema: JSONSchema.BaseSchema) => void): AiBinding<z.infer<S>, Name> {
      return {
        zod,
        descriptor: {
          description,
          parameters: zod.toJSONSchema({
            reused: 'ref',
            override: override ? ctx => override(ctx.jsonSchema) : undefined
          }),
          name
        }
      };
    },
    void(): AiBinding<void, Name> {
      return {
        descriptor: {
          description,
          name
        }
      };
    }
  };
}

export interface AiBinding<_Arg, Name extends string> {
  zod?: z.ZodObject;
  descriptor: ToolDescriptor['function'] & {
    name: Name;
  };
}

export type AiSetter<Bindings extends readonly AiBinding<any, string>[]> = {
  [Binding in Bindings[number] as Binding['descriptor']['name']]: (
    arg: Binding extends AiBinding<infer Arg, string> ? Arg : never
  ) => Promise<object>;
};

export interface AiRoute<_Arg = any> {
  name: string;
  paths: string[];
  notAvailableMessage: string;
  argSchema?: ToolDescriptor['function']['parameters'];
}

export function aiRoute(name: string, paths: string[], notAvailableMessage: string) {
  return {
    arg<S extends z.ZodObject>(zod: S): AiRoute<z.infer<S>> {
      return {
        name,
        paths,
        notAvailableMessage,
        argSchema: zod.toJSONSchema()
      };
    },
    void(): AiRoute<void> {
      return {
        name,
        paths,
        notAvailableMessage
      };
    }
  };
}

export interface AiBindingsStore<Bindings extends readonly AiBinding<any, string>[] = readonly AiBinding<any, string>[], RouteArg = any> {
  readonly bindings: Bindings;
  readonly functionNames: Set<string>;
  readonly route?: AiRoute<RouteArg>;
  tryGet(): AiSetter<Bindings> | null;
  bind(setter: AiSetter<Bindings>): () => void;
  bindWait(finishSignal: AbortSignal): () => void;
  bindError(error: string | Error): () => void;
}

export function buildAiBindingStoreFactory<Bindings extends readonly AiBinding<any, string>[], RouteArg>(
  bindings: Bindings,
  route?: AiRoute<RouteArg>
): () => AiBindingsStore<Bindings, RouteArg> {
  return () => {
    let setter: AiSetter<Bindings> | null = null;
    return {
      bindings,
      functionNames: new Set(bindings.map(b => b.descriptor.name)),
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
        for (const binding of bindings) {
          setter[binding.descriptor.name] = async () => toolWait(finishSignal);
        }
        return this.bind(setter as AiSetter<Bindings>);
      },
      bindError(error: string | Error) {
        const setter: AiSetter<any> = {};
        for (const binding of bindings) {
          setter[binding.descriptor.name] = async () => toolError(error);
        }
        return this.bind(setter as AiSetter<Bindings>);
      }
    };
  };
}
