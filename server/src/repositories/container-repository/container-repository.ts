import { UpsertContainerRequest } from '@aila/model';
import { Repository } from '../repository';

export class Container {
  public static async create(data: UpsertContainerRequest): Promise<Container> {
    return new Container(data.name, data.isEnabled, data.description, data.configuration, data.envVariables, data.hash);
  }

  public constructor(
    public readonly name: string,
    public isEnabled: boolean,
    public description: string,
    public configuration: string,
    public envVariables: Record<string, string>,
    public hash: string
  ) {}
}

export interface ContainerRepository extends Repository {
  upsert(container: Container): Promise<void>;
  tryGet(name: string): Promise<Container | null>;
}
