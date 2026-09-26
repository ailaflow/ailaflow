import {
  JsonSchema,
  ProcessDefinition,
  ProcessDisplay,
  ProcessExecutionMode,
  ProcessRootValidator,
  ProcessStepValidator,
  ProcessValidator,
  SaveProcessRequest
} from '@ailaflow/shared';
import { ProcessVariables } from './process-variables';
import { DefinitionWalker } from 'sequential-workflow-model';
import { ProcessRepositoryError } from './process-repository';

function validateProcessDefinition(
  definition: ProcessDefinition,
  rootValidator: ProcessRootValidator,
  stepValidator: ProcessStepValidator
): {
  nSteps: number;
  nReturnSteps: number;
  isPausable: boolean;
} {
  if (!rootValidator.validate(definition)) {
    throw new ProcessRepositoryError('Validation failed for root');
  }

  const walker = new DefinitionWalker();
  let nSteps = 0;
  let isPausable = false;
  let nReturnSteps = 0;

  walker.forEach(definition, (step, _, sequence) => {
    if (!stepValidator.validateStep(step, sequence, definition)) {
      throw new ProcessRepositoryError(`Validation failed for step: ${step.id}`);
    }
    if (!isPausable) {
      isPausable = step.type === 'task';
    }
    if (step.type === 'return') {
      nReturnSteps++;
    }
    nSteps++;
  });

  return {
    nSteps,
    nReturnSteps,
    isPausable
  };
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
      schemas[v.name] = v.schema;
      count++;
    }
  }
  return count > 0 ? schemas : null;
}

export class Process {
  public static create(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator): Process {
    validateName(data.name);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    const { nSteps, nReturnSteps, isPausable } = validateProcessDefinition(data.definition, rootValidator, stepValidator);
    const startVariableSchemas = extractStartVariableSchemas(data.definition);

    return new Process(
      data.name,
      data.description,
      data.userAccessExpression,
      data.display,
      data.executionMode,
      data.definition,
      data.hash,
      startVariableSchemas,
      nSteps,
      nReturnSteps,
      isPausable
    );
  }

  private variablesCache: ProcessVariables | null = null;

  public constructor(
    public readonly name: string,
    public description: string,
    public userAccessExpression: string,
    public display: ProcessDisplay,
    public executionMode: ProcessExecutionMode,
    public definition: ProcessDefinition,
    public hash: string,
    public startVariableSchemas: Record<string, JsonSchema> | null,
    public nSteps: number,
    public nReturnSteps: number,
    public isPausable: boolean
  ) {}

  public async update(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator) {
    if (data.name !== this.name) {
      throw new Error('Process name cannot be changed');
    }
    const { nSteps, nReturnSteps, isPausable } = validateProcessDefinition(data.definition, rootValidator, stepValidator);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    this.description = data.description;
    this.userAccessExpression = data.userAccessExpression;
    this.display = data.display;
    this.executionMode = data.executionMode;
    this.definition = data.definition;
    this.variablesCache = null;
    this.hash = data.hash;
    this.startVariableSchemas = extractStartVariableSchemas(data.definition);
    this.nSteps = nSteps;
    this.nReturnSteps = nReturnSteps;
    this.isPausable = isPausable;
  }

  public get variables(): ProcessVariables {
    return (
      this.variablesCache ??
      (this.variablesCache = new ProcessVariables(this.definition.properties.startVariableNames, this.definition.properties.variables))
    );
  }
}
