export class PublicUrlValidator {
  public static validate(publicUrl: string | null): string | null {
    if (publicUrl === null) {
      return null;
    }

    const trimmed = publicUrl.trim();
    if (!trimmed) {
      return 'Public URL is required';
    }

    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return 'Public URL is invalid';
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Public URL must use HTTP or HTTPS';
    }
    if (url.username || url.password) {
      return 'Public URL cannot contain credentials';
    }
    if (url.search) {
      return 'Public URL cannot contain query parameters';
    }
    if (url.hash) {
      return 'Public URL cannot contain a fragment';
    }
    return null;
  }
}
