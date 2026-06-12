import { ProcessDefinition, ProcessRootValidator, ProcessStepValidator, UpdateProcessRequest } from '@aila/model';
import { Repository } from '../repository';
import { randomUUID } from 'crypto';
import { DefinitionWalker } from 'sequential-workflow-model';
import z from 'zod/v4';

function countInputs(definition: ProcessDefinition): number {
  return definition.properties.variables.filter(v => v.input).length;
}

function countOutputs(definition: ProcessDefinition): number {
  return definition.properties.variables.filter(v => v.output).length;
}

function validateProcessDefinition(
  definition: ProcessDefinition,
  rootValidator: ProcessRootValidator,
  stepValidator: ProcessStepValidator
): number {
  if (!rootValidator.validate(definition.properties)) {
    throw new Error('Validation failed for root properties');
  }

  const walker = new DefinitionWalker();
  let nSteps = 0;
  walker.forEach(definition, step => {
    if (!stepValidator.validateStep(step)) {
      throw new Error(`Validation failed for step: ${step.id}`);
    }
    nSteps++;
  });
  return nSteps;
}

export type VariableValidatorMap = Map<string, z.ZodType>;

export class Process {
  public static async create(
    data: Omit<UpdateProcessRequest, 'id'>,
    rootValidator: ProcessRootValidator,
    stepValidator: ProcessStepValidator
  ): Promise<Process> {
    const nSteps = validateProcessDefinition(data.definition, rootValidator, stepValidator);

    return new Process(
      randomUUID(),
      data.name,
      data.description,
      data.userList,
      data.definition,
      data.hash,
      countInputs(data.definition),
      countOutputs(data.definition),
      nSteps
    );
  }

  private vvmCache: VariableValidatorMap | null = null;

  public constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public userList: string,
    public definition: ProcessDefinition,
    public hash: string,
    public nInputs: number,
    public nOutputs: number,
    public nSteps: number
  ) {}

  public async update(data: UpdateProcessRequest, rootValidator: ProcessRootValidator, stepValidator: ProcessStepValidator) {
    if (data.id !== this.id) {
      throw new Error('Process ID cannot be changed');
    }
    const nSteps = validateProcessDefinition(data.definition, rootValidator, stepValidator);

    this.name = data.name;
    this.description = data.description;
    this.userList = data.userList;
    this.definition = data.definition;
    this.vvmCache = null;
    this.hash = data.hash;
    this.nInputs = countInputs(data.definition);
    this.nOutputs = countOutputs(data.definition);
    this.nSteps = nSteps;
  }

  public getVariableValidatorMap(): VariableValidatorMap {
    if (!this.vvmCache) {
      this.vvmCache = new Map(this.definition.properties.variables.map(v => [v.name, z.fromJSONSchema(v.schema)]));
    }
    return this.vvmCache;
  }
}

export interface ProcessRepository extends Repository {
  insert(process: Process): Promise<void>;
  update(process: Process): Promise<void>;
  tryGetById(id: string): Promise<Process | null>;
}
