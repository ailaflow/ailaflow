import { ProcessDefinition } from '@aila/model';
import { DefinitionWalker } from 'sequential-workflow-model';

const processWalker = new DefinitionWalker();

export class DefinitionPath {
  public static createStepPath(stepId: string, path: string): string {
    return `step/${stepId}/${path}`;
  }

  public static createRootPath(path: string): string {
    return `root/${path}`;
  }

  public static readPath<T>(definition: ProcessDefinition, path: string): T {
    const { object, pathParts } = parse(definition, path);
    return resolve(object, pathParts, pathParts.length) as T;
  }

  public static writePath<T>(definition: ProcessDefinition, path: string, value: T) {
    const { object, pathParts: names } = parse(definition, path);
    const c = names.length - 1;
    const target = resolve(object, names, c);
    target[names[c]] = value;
  }
}

function parse(definition: ProcessDefinition, path: string) {
  const [type, p0, p1] = path.split('/', 3);

  let object: object;
  let parts: string;
  if (type === 'root') {
    object = definition;
    parts = p0;
  } else if (type === 'step') {
    const step = processWalker.findById(definition, p0);
    if (!step) {
      throw new Error(`Cannot find step: ${p0}`);
    }
    object = step;
    parts = p1;
  } else {
    throw new Error(`Invalid path: ${path}`);
  }

  return {
    object,
    pathParts: parts.split('.')
  };
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
