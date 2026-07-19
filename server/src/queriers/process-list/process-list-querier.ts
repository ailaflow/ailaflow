import { ProcessLiteDto } from '@aila/model';

export interface ProcessListQuerier {
  query(abortSignal: AbortSignal): Promise<ProcessLiteDto[]>;
}
