export interface SandboxRpcHandler {
  methodName: string;
  handle(abortSignal: AbortSignal, sandboxName: string, executionId: string, data: unknown): Promise<unknown>;
}
