export class ResourceNameNormalizer {
  public static removePrefix(name: string, prefix: '/' | '$' | '#' | '+'): string {
    if (name.startsWith(prefix)) {
      return name.substring(1);
    }
    return name;
  }
}
