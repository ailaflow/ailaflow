import { ProcessDefinition } from '@ailaflow/shared';
import { DefinitionWalker, Step } from 'sequential-workflow-model';

const processWalker = new DefinitionWalker();

export type DefinitionPathValue<T> =
  | {
      isRoot: true;
      pathParts: string[];
      parent: ProcessDefinition;
      value: T;
    }
  | {
      isRoot: false;
      pathParts: string[];
      parent: Step;
      value: T;
    };

export class DefinitionPath {
  public static createStepPath(stepId: string, path: string): string {
    return `step/${stepId}/${path}`;
  }

  public static createRootPath(path: string): string {
    return `root/${path}`;
  }

  public static parsePath(
    definition: ProcessDefinition,
    path: string
  ): { stepId: null; parent: ProcessDefinition; pathParts: string[] } | { stepId: string; parent: Step; pathParts: string[] } {
    if (!path) {
      throw new Error('Path is empty');
    }
    const [type, p0, p1] = path.split('/', 3);

    if (type === 'root') {
      return {
        stepId: null,
        parent: definition,
        pathParts: p0.split('.')
      };
    }
    if (type === 'step') {
      const step = processWalker.findById(definition, p0);
      if (!step) {
        throw new Error(`Cannot find step: ${p0}`);
      }
      return {
        stepId: p0,
        parent: step,
        pathParts: p1.split('.')
      };
    }
    throw new Error(`Unsupported path: ${path}`);
  }

  public static readPath<T>(definition: ProcessDefinition, path: string): DefinitionPathValue<T> {
    const { stepId, parent, pathParts } = DefinitionPath.parsePath(definition, path);
    const value = resolve(parent, pathParts, pathParts.length) as T;
    if (stepId !== null) {
      return {
        isRoot: false,
        pathParts,
        parent,
        value
      };
    }
    return {
      isRoot: true,
      pathParts,
      parent,
      value
    };
  }

  public static writePath<T>(definition: ProcessDefinition, path: string, value: T) {
    const { parent, pathParts: names } = DefinitionPath.parsePath(definition, path);
    const c = names.length - 1;
    const target = resolve(parent, names, c);
    target[names[c]] = value;
  }
}

function resolve(object: object, pathParts: string[], count: number) {
  let current: any = object;
  for (let i = 0; i < count; i++) {
    const pathPart = pathParts[i];
    if (Array.isArray(current)) {
      current = current[Number(pathPart)];
    } else {
      current = current[pathPart];
    }
    if (current === undefined || current === null) {
      throw new Error(`Cannot read path: ${pathParts.join('.')}`);
    }
  }
  return current;
}
