import { ProcessDefinition } from '@aila/model';
import { Definition, DefinitionWalker, Step } from 'sequential-workflow-model';

const processWalker = new DefinitionWalker();

export class DefinitionPath {
  public static createStepPath(stepId: string, path: string): string {
    return `step/${stepId}/${path}`;
  }

  public static createRootPath(path: string): string {
    return `root/${path}`;
  }

  public static parsePath(definition: ProcessDefinition, path: string) {
    if (!path) {
      throw new Error('Path is empty');
    }
    const [type, p0, p1] = path.split('/', 3);

    let stepId: string | null;
    let object: Definition | Step;
    let parts: string;
    if (type === 'root') {
      stepId = null;
      object = definition;
      parts = p0;
    } else if (type === 'step') {
      stepId = p0;
      const step = processWalker.findById(definition, stepId);
      if (!step) {
        throw new Error(`Cannot find step: ${stepId}`);
      }
      object = step;
      parts = p1;
    } else {
      throw new Error(`Invalid path: ${path}`);
    }

    return {
      stepId,
      object,
      pathParts: parts.split('.')
    };
  }

  public static readPath<T>(
    definition: ProcessDefinition,
    path: string
  ): {
    isRoot: boolean;
    object: Definition | Step;
    value: T;
  } {
    const { stepId, object, pathParts } = DefinitionPath.parsePath(definition, path);
    return {
      isRoot: stepId === null,
      object,
      value: resolve(object, pathParts, pathParts.length) as T
    };
  }

  public static writePath<T>(definition: ProcessDefinition, path: string, value: T) {
    const { object, pathParts: names } = DefinitionPath.parsePath(definition, path);
    const c = names.length - 1;
    const target = resolve(object, names, c);
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
