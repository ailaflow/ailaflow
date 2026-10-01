import {
  ExportedProcess,
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
import { ProcessRepositoryError } from './process-repository';
import { ProcessDefinitionWalker } from './process-definition-walker';

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
  public static import(
    e: ExportedProcess,
    userName: string,
    rootValidator: ProcessRootValidator,
    stepValidator: ProcessStepValidator
  ): Process {
    validateName(e.name);
    validateDescription(e.description);

    const result = ProcessDefinitionWalker.validateAndScan(e.definition, rootValidator, stepValidator);
    return new Process(
      e.name,
      e.description,
      e.userAccess === 'installer' ? `@${userName}` : '',
      e.userAccess === 'installer' ? ProcessDisplay.LISTED : ProcessDisplay.FEATURED,
      ProcessExecutionMode.AI_TOOL_OR_START_FORM,
      e.icon,
      e.definition,
      e.hash,
      extractStartVariableSchemas(e.definition),
      result.nSteps,
      result.nReturnSteps,
      result.nTasksSteps,
      result.sandboxNames
    );
  }

  public static create(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator): Process {
    validateName(data.name);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    const result = ProcessDefinitionWalker.validateAndScan(data.definition, rootValidator, stepValidator);

    return new Process(
      data.name,
      data.description,
      data.userAccessExpression,
      data.display,
      data.executionMode,
      data.icon,
      data.definition,
      data.hash,
      extractStartVariableSchemas(data.definition),
      result.nSteps,
      result.nReturnSteps,
      result.nTasksSteps,
      result.sandboxNames
    );
  }

  private variablesCache: ProcessVariables | null = null;

  public constructor(
    public readonly name: string,
    public description: string,
    public userAccessExpression: string,
    public display: ProcessDisplay,
    public executionMode: ProcessExecutionMode,
    public icon: string | null,
    public definition: ProcessDefinition,
    public hash: string,
    public startVariableSchemas: Record<string, JsonSchema> | null,
    public nSteps: number,
    public nReturnSteps: number,
    public nTasksSteps: number,
    public sandboxNames: string[]
  ) {}

  public async update(data: SaveProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator) {
    if (data.name !== this.name) {
      throw new Error('Process name cannot be changed');
    }
    const result = ProcessDefinitionWalker.validateAndScan(data.definition, rootValidator, stepValidator);
    validateDescription(data.description);
    validateUserAccessExpression(data.userAccessExpression);

    this.description = data.description;
    this.userAccessExpression = data.userAccessExpression;
    this.display = data.display;
    this.executionMode = data.executionMode;
    this.icon = data.icon;
    this.definition = data.definition;
    this.variablesCache = null;
    this.hash = data.hash;
    this.startVariableSchemas = extractStartVariableSchemas(data.definition);
    this.nSteps = result.nSteps;
    this.nReturnSteps = result.nReturnSteps;
    this.nTasksSteps = result.nTasksSteps;
    this.sandboxNames = result.sandboxNames;
  }

  public get variables(): ProcessVariables {
    return (
      this.variablesCache ??
      (this.variablesCache = new ProcessVariables(this.definition.properties.startVariableNames, this.definition.properties.variables))
    );
  }
}
