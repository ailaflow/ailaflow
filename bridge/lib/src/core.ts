function getExecutionToken(): string {
  const token = process.env.EXECUTION_TOKEN;
  if (!token || token.length < 1) {
    throw new Error('Execution token is not defined in environment variables');
  }
  return token;
}

export interface RpcConfig {
  timeout?: number;
}

export async function rpc<T = unknown>(type: string, payload: unknown, rpcConfig?: RpcConfig): Promise<T> {
  const timeout = rpcConfig?.timeout ?? 10_000;

  const executionToken = getExecutionToken();
  const body = JSON.stringify({ type, executionToken, payload, timeout });
  const response = await fetch('http://127.0.0.1:4096/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body,
    keepalive: true,
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error('Failed to send request to host');
  }

  return (await response.json()) as T;
}
