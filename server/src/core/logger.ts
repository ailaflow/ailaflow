import type { Logger as AiBindKitLogger } from '@aibindkit/express';
export class Logger implements AiBindKitLogger {
  public constructor(private readonly tag: string) {}

  public log(message: string) {
    console.log(`\x1b[90m${this.prefix()}\x1b[0m ${message}`);
  }

  public error(message: string) {
    console.error(`\x1b[31m${this.prefix()} ${message}\x1b[0m`);
  }

  public warn(message: string) {
    console.warn(`\x1b[33m${this.prefix()} ${message}\x1b[0m`);
  }

  private prefix() {
    const iso = new Date().toISOString();
    const t = iso.indexOf('T');
    const z = iso.indexOf('Z');
    return `${iso.substring(t + 1, z)} ${this.tag}:`;
  }
}
