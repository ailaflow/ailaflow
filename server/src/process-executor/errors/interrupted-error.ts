export class InterruptedError extends Error {
  public constructor(
    public readonly code: number,
    public readonly reason: string
  ) {
    super(`Interrupted with code: ${code} and reason: ${reason}`);
  }
}
