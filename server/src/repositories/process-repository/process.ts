import { ProcessDefinition, ProcessRootValidator, ProcessStepValidator, ProcessValidator, SaveProcessRequest } from '@aila/model';
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

export type VariableValidatorMap = Map<string, z.ZodType>;

export class Process {
  public static create(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator): Process {
    const nSteps = validateProcessDefinition(data.definition, rootValidator, stepValidator);
    validateName(data.name);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    return new Process(
      data.name,
      data.description,
      data.userAccessExpression,
      data.definition,
      data.hash,
      data.definition.properties.startVariableNames.length,
      nSteps
    );
  }

  private vvmCache: VariableValidatorMap | null = null;

  public constructor(
    public readonly name: string,
    public description: string,
    public userAccessExpression: string,
    public definition: ProcessDefinition,
    public hash: string,
    public nStartInputs: number,
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
    this.nStartInputs = data.definition.properties.startVariableNames.length;
    this.nSteps = nSteps;
  }

  public getVariableValidatorMap(): VariableValidatorMap {
    if (!this.vvmCache) {
      this.vvmCache = new Map(this.definition.properties.variables.map(v => [v.name, z.fromJSONSchema(v.schema.schema)]));
    }
    return this.vvmCache;
  }
}
