import { ContainerLiteDto } from '@aila/model';

export interface ContainerListQuerier {
  query(): Promise<ContainerLiteDto[]>;
}
