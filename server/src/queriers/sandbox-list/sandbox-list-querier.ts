import { SandboxLiteDto } from '@aila/model';

export interface SandboxListQuerier {
  query(): Promise<SandboxLiteDto[]>;
}
