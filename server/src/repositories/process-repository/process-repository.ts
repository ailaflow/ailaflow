import { ProcessDefinition, UpdateProcessRequest } from '@aila/model';
import { Repository } from '../repository';
import { randomUUID } from 'crypto';

export class Process {
  public static create(data: Omit<UpdateProcessRequest, 'id'>): Process {
    return new Process(randomUUID(), data.name, data.description, data.userList, data.definition);
  }

  public constructor(
    public readonly id: string,
    public name: string,
    public description: string,
    public userList: string,
    public definition: ProcessDefinition
  ) {}

  public update(data: Omit<UpdateProcessRequest, 'id'>): void {
    this.name = data.name;
    this.description = data.description;
    this.userList = data.userList;
    this.definition = data.definition;
  }
}

export interface ProcessRepository extends Repository {
  insert(process: Process): Promise<void>;
  update(process: Process): Promise<void>;
  tryGetById(id: string): Promise<Process | null>;
}
