import { LicenseType } from '@ailaflow/shared';

export interface LicenseValidationRequest {
  instanceId: string;
  type: LicenseType;
  key: string | null;
  users: number;
  activeUsers: number;
  version: string;
}

export interface LicenseValidationResult {
  validationError: string | null;
  canUpgrade: boolean;
}

export class LicenseValidator {
  private readonly runtime: string;

  public constructor() {
    this.runtime = getRuntime();
  }

  public async validate(signal: AbortSignal, request: LicenseValidationRequest): Promise<LicenseValidationResult> {
    const response = await fetch('https://license.ailaflow.com/validator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `AilaFlow/${request.version} ${this.runtime}`
      },
      body: JSON.stringify(request),
      signal,
      keepalive: false
    });
    if (!response.ok) {
      throw new Error(`License validation request returned HTTP ${response.status}.`);
    }
    return (await response.json()) as LicenseValidationResult;
  }
}

function getRuntime(): string {
  const deno = (
    globalThis as typeof globalThis & {
      Deno?: { version: { deno: string } };
    }
  ).Deno;
  if (deno) {
    return `Deno/${deno.version.deno}`;
  }
  if (process.versions?.bun) {
    return `Bun/${process.versions.bun}`;
  }
  if (process.versions?.node) {
    return `Node/${process.versions.node}`;
  }
  return 'Unknown';
}
