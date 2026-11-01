import { PublicUrlValidator } from '@ailaflow/shared';

export type KvConfigurationKey = 'publicUrl';

export class KvConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = KvConfigurationError.name;
  }
}

export class KvConfiguration {
  private readonly changed: KvConfigurationKey[] = [];

  public constructor(public publicUrl: string | null = null) {}

  public setPublicUrl(publicUrl: string | null) {
    const error = PublicUrlValidator.validate(publicUrl);
    if (error) {
      throw new KvConfigurationError(`Invalid public URL: ${error}`);
    }
    this.publicUrl = publicUrl;
    this.changed.push('publicUrl');
  }

  public getChangedKeys(): KvConfigurationKey[] {
    return [...this.changed];
  }

  public clone(): KvConfiguration {
    const clone = new KvConfiguration(this.publicUrl);
    clone.changed.push(...this.changed);
    return clone;
  }
}
