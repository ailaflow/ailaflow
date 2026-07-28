export class ProcessResourceId {
  public static create(name: string): string {
    return `process:${name}`;
  }
}
