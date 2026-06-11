import { SandboxRpcHandler } from './sandbox-rpc-handler';

export class SandboxRpcHandlerProvider {
  private readonly map = new Map<string, SandboxRpcHandler>();

  public constructor(handlers: SandboxRpcHandler[]) {
    for (const handler of handlers) {
      this.map.set(handler.methodName, handler);
    }
  }

  public get(method: string): SandboxRpcHandler {
    const handler = this.map.get(method);
    if (!handler) {
      throw new Error(`No handler found for method: ${method}`);
    }
    return handler;
  }
}
