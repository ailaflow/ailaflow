import { SandboxLiteDto } from '@ailaflow/shared';

export interface SandboxListQuerier {
  query(signal: AbortSignal): Promise<SandboxLiteDto[]>;
}
