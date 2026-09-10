export class PublicUrlValidator {
  public static validate(publicUrl: string | null): string | null {
    if (publicUrl === null) {
      return null;
    }

    if (!publicUrl.trim()) {
      return 'Public URL is required';
    }

    if (publicUrl !== publicUrl.trim()) {
      return 'Public URL cannot contain surrounding whitespace';
    }

    let url: URL;
    try {
      url = new URL(publicUrl);
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
    if (publicUrl.endsWith('/')) {
      return 'Public URL cannot end with a slash';
    }
    const expected = `${url.origin}${url.pathname === '/' ? '' : url.pathname}`;
    if (publicUrl !== expected) {
      return `Public URL must be written as ${expected}`;
    }
    return null;
  }
}
