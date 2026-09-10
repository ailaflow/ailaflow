import { LicenseType, PublicUrlValidator } from '@ailaflow/model';

export type KvConfigurationKey = 'publicUrl' | 'instanceId' | 'licenseType' | 'licenseKey';

export class KvConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = KvConfigurationError.name;
  }
}

export class KvConfiguration {
  private readonly changed: KvConfigurationKey[] = [];

  public constructor(
    public publicUrl: string | null = null,
    public instanceId: string | null = null,
    public licenseType: LicenseType | null = null,
    public licenseKey: string | null = null
  ) {}

  public setPublicUrl(publicUrl: string | null) {
    const error = PublicUrlValidator.validate(publicUrl);
    if (error) {
      throw new KvConfigurationError(`Invalid public URL: ${error}`);
    }
    this.publicUrl = publicUrl;
    this.changed.push('publicUrl');
  }

  public setInstanceId(instanceId: string | null) {
    this.instanceId = instanceId;
    this.changed.push('instanceId');
  }

  public setLicenseType(type: LicenseType, key: string | null) {
    this.licenseType = type;
    this.licenseKey = key;
    this.changed.push('licenseType', 'licenseKey');
  }

  public getChangedKeys(): KvConfigurationKey[] {
    return [...this.changed];
  }

  public clone(): KvConfiguration {
    const clone = new KvConfiguration(this.publicUrl, this.instanceId, this.licenseType, this.licenseKey);
    clone.changed.push(...this.changed);
    return clone;
  }
}
