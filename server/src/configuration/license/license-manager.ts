import { LicenseStatus, LicenseType } from '@ailaflow/model';
import { KvConfigurationManager } from '../kv/kv-configuration-manager';
import { LicenseValidator } from './license-validator';
import { Logger } from '../../core/logger';
import { randomUUID } from 'crypto';

export class LicenseManager {
  private readonly logger = new Logger(LicenseManager.name);

  private abortController: AbortController | null = null;
  private statusCache: LicenseStatus | null = null;

  public constructor(
    private readonly licenseValidator: LicenseValidator,
    private readonly configurationManager: KvConfigurationManager
  ) {}

  public getStatus(): LicenseStatus | null {
    return this.statusCache;
  }

  private async getInstanceId(abortSignal: AbortSignal): Promise<string> {
    const config = await this.configurationManager.get(abortSignal);
    let instanceId = config.instanceId;
    if (!instanceId) {
      instanceId = randomUUID();
      config.setInstanceId(instanceId);
      await this.configurationManager.update(abortSignal, config);
    }
    return instanceId;
  }

  public async validate(abortSignal: AbortSignal, type: LicenseType, key: string | null): Promise<LicenseStatus> {
    const instanceId = await this.getInstanceId(abortSignal);
    const response = await this.licenseValidator.validate(abortSignal, instanceId, type, key);
    return {
      type,
      isValid: response.isValid,
      proof: response.proof,
      checkedAt: Date.now()
    };
  }

  public async tryValidateAndSet(abortSignal: AbortSignal, type: LicenseType, key: string | null): Promise<boolean> {
    const status = await this.validate(abortSignal, type, key);
    if (!status.isValid) {
      return false;
    }

    const config = await this.configurationManager.get(abortSignal);
    config.setLicenseType(type, key);
    await this.configurationManager.update(abortSignal, config);
    this.statusCache = status;
    return true;
  }

  public async validateOnBackground(): Promise<void> {
    if (this.abortController) {
      return;
    }
    this.abortController = new AbortController();

    const abortSignal = AbortSignal.any([this.abortController.signal, AbortSignal.timeout(5_000)]);
    try {
      const config = await this.configurationManager.get(abortSignal);
      if (!config.licenseType) {
        return;
      }
      this.statusCache = await this.validate(abortSignal, config.licenseType, config.licenseKey);
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
