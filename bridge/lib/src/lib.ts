import { rpc, RpcConfig } from './core';

/**
 * Reads a variable from the currently executing process.
 * @param name The name of the variable to read.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns The value of the variable or `null` if the variable is not set.
 * @throws If the variable does not exist or if the RPC call fails.
 */
export function readVariable<T = any>(name: string, rpcConfig?: RpcConfig): Promise<T | null> {
  return rpc<T>('readVariable', { name }, rpcConfig);
}

/**
 * Writes a value to a variable in the currently executing process.
 * @param name The name of the variable to write to.
 * @param value The value to write.
 * @param rpcConfig Optional configuration for the RPC call.
 * @throws If the variable does not exist or if the RPC call fails.
 */
export async function writeVariable(name: string, value: unknown, rpcConfig?: RpcConfig): Promise<void> {
  return rpc<void>('writeVariable', { name, value }, rpcConfig);
}

/**
 * Logs a message to the process logs.
 * @param texts The texts to log. They will be concatenated with spaces.
 */
export function log(...texts: unknown[]) {
  const items = texts.map(t => (typeof t === 'string' ? t : JSON.stringify(t)));
  process.stdout.write(items.join(' ') + '\n');
}
