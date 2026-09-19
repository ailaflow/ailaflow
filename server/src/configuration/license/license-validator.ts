import { LicenseType } from '@ailaflow/shared';

export interface LicenseValidationRequest {
  instanceId: string;
  type: LicenseType;
  key: string | null;
  users: number;
  version: string;
}

export interface LicenseValidationResult {
  validationError: string | null;
  canUpgrade: boolean;
}

export class LicenseValidator {
  public async validate(signal: AbortSignal, request: LicenseValidationRequest): Promise<LicenseValidationResult> {
    signal.throwIfAborted();
    if (request.type !== LicenseType.BUSINESS) {
      return { validationError: null, canUpgrade: false };
    }
    // TODO:
    return request.key?.includes('valid')
      ? { validationError: null, canUpgrade: false }
      : { validationError: 'Invalid license key', canUpgrade: false };
  }
}
