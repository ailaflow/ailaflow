import { ProcessDefinition, UpdateProcessRequest } from '@aila/model';
import { Repository } from '../repository';
import { randomUUID } from 'crypto';

function countInputs(definition: ProcessDefinition): number {
  return definition.properties.variables.filter(v => v.input).length;
}

function countOutputs(definition: ProcessDefinition): number {
  return definition.properties.variables.filter(v => v.output).length;
}

export class Process {
  public static create(data: Omit<UpdateProcessRequest, 'id'>): Process {
    return new Process(
      randomUUID(),
      data.name,
      data.description,
      data.userList,
      data.definition,
      countInputs(data.definition),
      countOutputs(data.definition)
    );
  }

  public constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public userList: string,
    public definition: ProcessDefinition,
    public nInputs: number,
    public nOutputs: number
  ) {}

  public update(data: UpdateProcessRequest) {
    if (data.id !== this.id) {
      throw new Error('Process ID cannot be changed');
    }
    this.name = data.name;
    this.description = data.description;
    this.userList = data.userList;
    this.definition = data.definition;
    this.nInputs = countInputs(data.definition);
    this.nOutputs = countOutputs(data.definition);
  }
}

export interface ProcessRepository extends Repository {
  insert(process: Process): Promise<void>;
  update(process: Process): Promise<void>;
  tryGetById(id: string): Promise<Process | null>;
}
