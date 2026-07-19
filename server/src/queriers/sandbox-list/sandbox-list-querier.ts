import { SandboxLiteDto } from '@aila/model';

export interface SandboxListQuerier {
  query(abortSignal: AbortSignal): Promise<SandboxLiteDto[]>;
}
