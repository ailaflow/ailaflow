import { readFileSync } from 'fs';

const TOKEN_PRE = '>'.repeat(20);
const TOKEN_POST = '<'.repeat(20);

export interface RpcConfig {
  timeout?: number;
}

export function readInput<T = unknown>(): T {
  return JSON.parse(readFileSync(0, 'utf-8')) as T;
}

export function writeOutput(result: unknown): void {
  process.stdout.write(TOKEN_PRE);
  process.stdout.write(JSON.stringify(result));
  process.stdout.write(TOKEN_POST);
}

export async function rpc<T = unknown>(type: string, payload: unknown, config?: RpcConfig): Promise<T> {
  const response = await fetch('http://127.0.0.1:4096/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type, payload }),
    keepalive: true,
    signal: AbortSignal.timeout(config?.timeout ?? 30_000)
  });
  if (!response.ok) {
    throw new Error('Failed to send request to host');
  }
  return (await response.json()) as T;
}

export function sendNotification(user: string, notification: unknown): Promise<unknown> {
  return rpc('notification', { user, notification });
}
