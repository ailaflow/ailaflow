export class Logger {
  constructor(tag) {
    this.tag = tag;
  }

  log(message) {
    console.log(`${this.prefix()} ${message}`);
  }

  prefix() {
    const iso = new Date().toISOString();
    const t = iso.indexOf('T');
    const z = iso.indexOf('Z');
    return `${iso.substring(t + 1, z)} ${this.tag}:`;
  }
}
