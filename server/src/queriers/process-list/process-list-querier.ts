import { ProcessLiteDto } from '@aila/model';

export interface ProcessListQuerier {
  query(): Promise<ProcessLiteDto[]>;
}
