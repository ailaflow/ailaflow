import { SandboxLiteDto } from '@ailaflow/shared';

export interface SandboxListQuerier {
  query(abortSignal: AbortSignal): Promise<SandboxLiteDto[]>;
}
