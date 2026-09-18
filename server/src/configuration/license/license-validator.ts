import { LicenseType } from '@ailaflow/shared';

export class LicenseValidator {
  public async validate(
    abortSignal: AbortSignal,
    _instanceId: string,
    type: LicenseType,
    key: string | null,
    _users: number,
    _activeUsers: number,
    _version: string
  ): Promise<{
    validationError: string | null;
    proof: string | null;
  }> {
    abortSignal.throwIfAborted();
    if (type !== LicenseType.BUSINESS) {
      return { validationError: null, proof: null };
    }
    // TODO:
    return key?.includes('valid') ? { validationError: null, proof: 'proof' } : { validationError: 'Invalid license key', proof: null };
  }
}
