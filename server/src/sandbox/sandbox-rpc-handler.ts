export interface SandboxRpcHandler {
  methodName: string;
  handle(signal: AbortSignal, sandboxName: string, executionId: string, data: unknown): Promise<unknown>;
}
