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
  public async validate(signal: AbortSignal, request: LicenseValidationRequest): Promise<LicenseValidationResult> {
    const response = await fetch('https://license.ailaflow.com/validator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
