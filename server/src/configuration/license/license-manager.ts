import { LicenseType } from '@ailaflow/shared';
import { KvConfigurationManager } from '../kv/kv-configuration-manager';
import { LicenseValidationResult, LicenseValidator } from './license-validator';
import { Logger } from '../../core/logger';
import { randomUUID } from 'crypto';
import { UserRepository } from '../../repositories/user/user-repository';
import { VersionProvider } from '../../core/version-provider';
import { AsyncMutex } from '../../core/async-mutex';

export interface LicenseStatus {
  type: LicenseType;
  checkedAt: number;
  validationResult: LicenseValidationResult;
}

export class LicenseManager {
  private readonly instanceIdMutex = new AsyncMutex();
  private readonly logger = new Logger(LicenseManager.name);

  private abortController: AbortController | null = null;
  private status: LicenseStatus | null = null;

  public constructor(
    private readonly licenseValidator: LicenseValidator,
    private readonly configurationManager: KvConfigurationManager,
    private readonly userRepository: UserRepository,
    private readonly versionProvider: VersionProvider
  ) {}

  public getStatus(): LicenseStatus | null {
    return this.status;
  }

  public async getInstanceId(abortSignal: AbortSignal): Promise<string> {
    const release = await this.instanceIdMutex.acquire();
    try {
      const config = await this.configurationManager.get(abortSignal);
      let instanceId = config.instanceId;
      if (!instanceId) {
        instanceId = randomUUID();
        config.setInstanceId(instanceId);
        await this.configurationManager.update(abortSignal, config);
      }
      return instanceId;
    } finally {
      release();
    }
  }

  private async validate(signal: AbortSignal, type: LicenseType, key: string | null): Promise<LicenseStatus> {
    const [instanceId, users] = await Promise.all([this.getInstanceId(signal), this.userRepository.count(signal)]);
    const version = this.versionProvider.get();
    const validationResult = await this.licenseValidator.validate(signal, {
      instanceId,
      type,
      key,
      users,
      version
    });
    return {
      type,
      checkedAt: Date.now(),
      validationResult
    };
  }

  public async tryValidateAndSet(signal: AbortSignal, type: LicenseType, key: string | null): Promise<string | null> {
    const status = await this.validate(signal, type, key);
    if (status.validationResult.validationError !== null) {
      return status.validationResult.validationError;
    }

    const config = await this.configurationManager.get(signal);
    config.setLicenseType(type, key);
    await this.configurationManager.update(signal, config);
    this.status = status;
    return null;
  }

  public async validateOnBackground(): Promise<void> {
    if (this.abortController) {
      return;
    }
    this.abortController = new AbortController();

    const signal = AbortSignal.any([this.abortController.signal, AbortSignal.timeout(5_000)]);
    try {
      const config = await this.configurationManager.get(signal);
      if (!config.licenseType) {
        return;
      }
      this.status = await this.validate(signal, config.licenseType, config.licenseKey);
    } catch (e) {
      this.logger.error(`Failed to validate license: ${e}`);
    } finally {
      this.abortController = null;
    }
  }

  public stopBackgroundValidation() {
    this.abortController?.abort();
  }
}
