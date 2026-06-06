import { UpsertContainerRequest } from '@aila/model';
import { Repository } from '../repository';

export class Container {
  public static create(data: UpsertContainerRequest): Container {
    return new Container(data.name, data.isEnabled, data.description, data.configuration);
  }

  public constructor(
    public readonly name: string,
    public isEnabled: boolean,
    public description: string,
    public configuration: string
  ) {}
}

export interface ContainerRepository extends Repository {
  upsert(container: Container): Promise<void>;
  tryGet(name: string): Promise<Container | null>;
}
