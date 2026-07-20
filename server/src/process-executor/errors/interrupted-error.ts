export enum InterruptedErrorCode {
  RETURN
}

export class InterruptedError extends Error {
  public constructor(
    public readonly code: InterruptedErrorCode,
    public readonly reason: string
  ) {
    super(`Interrupted with code: ${code} and reason: ${reason}`);
  }
}
