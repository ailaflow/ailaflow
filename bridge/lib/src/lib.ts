import { rpc, RpcConfig } from './core';

/**
 * Reads a variable from the currently executing process.
 * @param name The name of the variable to read.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns The value of the variable or `null` if the variable is not set.
 * @throws If the variable does not exist or if the RPC call fails.
 */
export function readVariable<T = any>(name: string, rpcConfig?: RpcConfig): Promise<T | null> {
  name = normalizeName(name, '$');
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
  name = normalizeName(name, '$');
  return rpc<void>('writeVariable', { name, value }, rpcConfig);
}

/**
 * Tries to read a value from a table by its primary key.
 * @param name The name of the table to read from.
 * @param pk The primary key of the row to read.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns The stored value or `null` if the row is not found.
 * @throws If the table does not exist or if the RPC call fails.
 */
export async function tryReadTable(name: string, pk: string, rpcConfig?: RpcConfig): Promise<unknown | null> {
  name = normalizeName(name, '#');
  return rpc<unknown>('tryReadTable', { name, pk }, rpcConfig);
}

/**
 * Writes a value to a table row, inserting or updating it by primary key.
 * @param name The name of the table to write to.
 * @param pk The primary key of the row to write.
 * @param value The value to write.
 * @param rpcConfig Optional configuration for the RPC call.
 * @throws If the table does not exist or if the RPC call fails.
 */
export async function writeTable(name: string, pk: string, value: unknown, rpcConfig?: RpcConfig): Promise<void> {
  name = normalizeName(name, '#');
  return rpc<void>('writeTable', { name, pk, value }, rpcConfig);
}

/**
 * Logs a message to the process logs.
 * @param texts The texts to log. They will be concatenated with spaces.
 */
export function log(...texts: unknown[]) {
  const items = texts.map(t => (typeof t === 'string' ? t : JSON.stringify(t)));
  process.stdout.write(items.join(' ') + '\n');
}

function normalizeName(name: string, prefix: string): string {
  if (name.startsWith(prefix)) {
    return name.substring(1);
  }
  return name;
}
