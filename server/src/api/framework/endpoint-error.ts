export class EndpointError extends Error {
  public constructor(
    publicMessage: string,
    public readonly status: number
  ) {
    super(publicMessage);
    this.name = EndpointError.name;
  }
}
