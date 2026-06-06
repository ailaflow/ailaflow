export class Logger {
  public constructor(private readonly tag: string) {}

  public log(message: string): void {
    console.log(`${this.prefix()} ${message}`);
  }

  private prefix(): string {
    const iso = new Date().toISOString();
    const t = iso.indexOf('T');
    const z = iso.indexOf('Z');
    return `${iso.substring(t + 1, z)} ${this.tag}:`;
  }
}
