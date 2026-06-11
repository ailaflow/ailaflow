function getExecutionId(): string {
  const id = process.env.EXECUTION_ID;
  if (!id || id.length < 1) {
    throw new Error('Execution ID is not defined in environment variables');
  }
  return id;
}

export interface RpcConfig {
  timeout?: number;
}

export async function rpc<T = unknown>(methodName: string, data: unknown, rpcConfig?: RpcConfig): Promise<T> {
  const timeout = rpcConfig?.timeout ?? 10_000;

  const executionId = getExecutionId();
  const body = JSON.stringify({ executionId, methodName, data, timeout });

  let response: Response;
  try {
    response = await fetch('http://127.0.0.1:4096/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body,
      keepalive: true,
      signal: AbortSignal.timeout(timeout)
    });
  } catch (e) {
    throw new Error(`Bridge connection failed: ${(e as Error)?.message ?? String(e)}`);
  }

  if (!response.ok) {
    let error: string | undefined;
    try {
      const content = await response.json();
      if (typeof content === 'object' && typeof content.error === 'string') {
        error = content.error;
      }
    } catch {
      // Ignore
    }
    throw new Error(error ? `${methodName}: ${error}` : `${methodName}: HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (e) {
    throw new Error(`Invalid bridge response for ${methodName}`);
  }
}
