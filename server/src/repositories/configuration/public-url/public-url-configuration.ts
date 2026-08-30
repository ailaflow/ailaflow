import { PublicUrlValidator } from '@aila/model';

export class PublicUrlConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = PublicUrlConfigurationError.name;
  }
}

export class PublicUrlConfiguration {
  public static create(publicUrl: string | null): PublicUrlConfiguration {
    const error = PublicUrlValidator.validate(publicUrl);
    if (error) {
      throw new PublicUrlConfigurationError(error);
    }
    return new PublicUrlConfiguration(publicUrl === null ? null : normalizePublicUrl(publicUrl));
  }

  public constructor(public readonly publicUrl: string | null) {}
}

function normalizePublicUrl(publicUrl: string): string {
  const url = new URL(publicUrl.trim());
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path}`;
}
