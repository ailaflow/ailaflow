import { SandboxLiteDto } from '@ailaflow/model';

export interface SandboxListQuerier {
  query(abortSignal: AbortSignal): Promise<SandboxLiteDto[]>;
}
