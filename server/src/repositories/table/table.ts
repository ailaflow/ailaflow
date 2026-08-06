export class Table {
  public static create(name: string, description: string) {
    return new Table(name, description);
  }

  public constructor(
    public readonly name: string,
    public description: string
  ) {}
}
