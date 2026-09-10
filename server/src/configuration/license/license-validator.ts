import { LicenseType } from '@ailaflow/shared';

export class LicenseValidator {
  public async validate(
    abortSignal: AbortSignal,
    _instanceId: string,
    type: LicenseType,
    key: string | null
  ): Promise<{
    isValid: boolean;
    proof: string | null;
  }> {
    abortSignal.throwIfAborted();
    if (type === LicenseType.HOME) {
      return { isValid: true, proof: null };
    }
    // TODO:
    return key?.includes('valid') ? { isValid: true, proof: 'proof' } : { isValid: false, proof: '' };
  }
}
