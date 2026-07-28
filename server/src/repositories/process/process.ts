import {
  JsonSchema,
  ProcessDefinition,
  ProcessExecutionVariableValues,
  ProcessRootValidator,
  ProcessStepValidator,
  ProcessValidator,
  SaveProcessRequest
} from '@aila/model';
import { DefinitionWalker } from 'sequential-workflow-model';
import { ProcessRepositoryError } from './process-repository';
import z from 'zod/v4';

function validateProcessDefinition(
  definition: ProcessDefinition,
  rootValidator: ProcessRootValidator,
  stepValidator: ProcessStepValidator
): number {
  if (!rootValidator.validate(definition)) {
    throw new ProcessRepositoryError('Validation failed for root');
  }

  const walker = new DefinitionWalker();
  let nSteps = 0;
  walker.forEach(definition, (step, _, sequence) => {
    if (!stepValidator.validateStep(step, sequence, definition)) {
      throw new ProcessRepositoryError(`Validation failed for step: ${step.id}`);
    }
    nSteps++;
  });
  return nSteps;
}

function validateName(name: string) {
  const error = ProcessValidator.validateName(name);
  if (error) {
    throw new ProcessRepositoryError(error);
  }
}

function validateDescription(description: string) {
  const error = ProcessValidator.validateDescription(description);
  if (error) {
    throw new ProcessRepositoryError(error);
  }
}

function validateUserAccessExpression(userAccessExpression: string) {
  const error = ProcessValidator.validateUserAccessExpression(userAccessExpression);
  if (error) {
    throw new ProcessRepositoryError(error);
  }
}

function extractStartVariableSchemas(definition: ProcessDefinition): Record<string, JsonSchema> | null {
  const schemas: Record<string, JsonSchema> = {};
  let count = 0;
  for (const v of definition.properties.variables) {
    if (definition.properties.startVariableNames.includes(v.name)) {
      schemas[v.name] = v.schema.schema;
      count++;
    }
  }
  return count > 0 ? schemas : null;
}

export type VariableValidatorMap = Map<string, z.ZodType>;

export class Process {
  public static create(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator): Process {
    validateName(data.name);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    const nSteps = validateProcessDefinition(data.definition, rootValidator, stepValidator);
    const startVariableSchemas = extractStartVariableSchemas(data.definition);

    return new Process(data.name, data.description, data.userAccessExpression, data.definition, data.hash, startVariableSchemas, nSteps);
  }

  private vvmCache: VariableValidatorMap | null = null;

  public constructor(
    public readonly name: string,
    public description: string,
    public userAccessExpression: string,
    public definition: ProcessDefinition,
    public hash: string,
    public startVariableSchemas: Record<string, JsonSchema> | null,
    public nSteps: number
  ) {}

  public async update(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator) {
    if (data.name !== this.name) {
      throw new Error('Process name cannot be changed');
    }
    const nSteps = validateProcessDefinition(data.definition, rootValidator, stepValidator);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    this.description = data.description;
    this.userAccessExpression = data.userAccessExpression;
    this.definition = data.definition;
    this.vvmCache = null;
    this.hash = data.hash;
    this.startVariableSchemas = extractStartVariableSchemas(data.definition);
    this.nSteps = nSteps;
  }

  public getVariableValidatorMap(): VariableValidatorMap {
    if (!this.vvmCache) {
      this.vvmCache = new Map(this.definition.properties.variables.map(v => [v.name, z.fromJSONSchema(v.schema.schema)]));
    }
    return this.vvmCache;
  }

  public validateStartValues(values: ProcessExecutionVariableValues): string | null {
    const passedVariableNames = Object.keys(values);
    if (!this.startVariableSchemas) {
      if (passedVariableNames.length > 0) {
        return 'Process does not have start variables';
      }
      return null;
    }
    const map = this.getVariableValidatorMap();
    for (const name of passedVariableNames) {
      const validator = map.get(name);
      if (!validator) {
        return `Variable \$${name} is not a start variable`;
      }
      const { error } = validator.safeParse(values[name]);
      if (error) {
        return `Variable value \$${name} does not meet the required schema: ${error}`;
      }
    }
    return null;
  }
}
