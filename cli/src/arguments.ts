export class ArgsParser {
  private readonly commands: string[] = [];
  private readonly args = new Map<string, string | null>();

  public constructor(argv: string[]) {
    for (let index = 2; index < argv.length; index++) {
      const value = argv[index];
      if (!value.startsWith('-')) {
        this.commands.push(value);
        continue;
      }

      const nameAndValue = value.replace(/^-+/, '');
      const separatorIndex = nameAndValue.indexOf('=');
      if (separatorIndex !== -1) {
        const name = nameAndValue.slice(0, separatorIndex);
        this.setArg(name, nameAndValue.slice(separatorIndex + 1));
        continue;
      }

      const nextValue = argv[index + 1];
      if (nextValue !== undefined && !nextValue.startsWith('-')) {
        this.setArg(nameAndValue, nextValue);
        index++;
      } else {
        this.setArg(nameAndValue, null);
      }
    }
  }

  public getCommand(defaultCommand: string): string {
    return this.commands.length > 0 ? this.commands.join(' ') : defaultCommand;
  }

  public getArg(name: string): string | undefined;
  public getArg(name: string, defaultValue: string): string;
  public getArg(name: string, defaultValue?: string): string | undefined {
    if (!this.args.has(name)) {
      return defaultValue;
    }

    const value = this.args.get(name);
    if (value === null || value === '') {
      throw new Error(`--${name} requires a value`);
    }
    return value;
  }

  public hasArg(name: string): boolean {
    return this.args.has(name);
  }

  public assertAllowedArgs(names: string[]): void {
    const allowedNames = new Set(names);
    for (const name of this.args.keys()) {
      if (!allowedNames.has(name)) {
        throw new Error(`Unknown option: --${name}`);
      }
    }
  }

  private setArg(name: string, value: string | null): void {
    if (!name) {
      throw new Error('Invalid empty option');
    }
    this.args.set(name, value);
  }
}

export const help = `Usage:
  aila [serve] [options]
  aila data path [options]
  aila data reset [options]

Commands:
  serve               Run the Aila server (default)
  data path           Print the application data directory
  data reset          Permanently delete all application data

Options:
  --port <number>      HTTP port for serve (default: 2048)
  --data-dir <path>    Application data directory (default: ~/.aila)
  --force              Skip confirmation for data reset
  --help               Show help`;
