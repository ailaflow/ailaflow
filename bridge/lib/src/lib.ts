import { rpc, RpcConfig } from './core';

export interface TablePage<Row extends TableRow = TableRow> {
  /** The rows included in this page. */
  rows: Row[];
  /** The one-based page number. */
  page: number;
  /** The number of rows requested per page. */
  pageSize: number;
  /** Whether another page is available. */
  hasMore: boolean;
}

export interface TableRow extends Record<string, unknown> {
  /** The row's identifier. */
  _id: string;
  /** The Unix timestamp in milliseconds of the last update. */
  _updatedAt: number;
}

export interface TableRowInput extends Record<string, unknown> {
  /** The row's identifier. */
  _id: string;
}

export type TableWhereValue = string | number | boolean;

export interface TableWhereOperators {
  /** Matches values equal to this value. */
  $eq?: TableWhereValue;
  /** Matches values not equal to this value. */
  $neq?: TableWhereValue;
  /** Matches values less than this value. */
  $lt?: TableWhereValue;
  /** Matches values greater than this value. */
  $gt?: TableWhereValue;
  /** Matches values less than or equal to this value. */
  $lte?: TableWhereValue;
  /** Matches values greater than or equal to this value. */
  $gte?: TableWhereValue;
}

export type TableWhereCondition = {
  [Operator in keyof TableWhereOperators]: Required<Pick<TableWhereOperators, Operator>> & Partial<Omit<TableWhereOperators, Operator>>;
}[keyof TableWhereOperators];

export type TableWhere = Record<string, TableWhereCondition>;

export interface ReadTablePageOptions {
  /** The one-based page number. Defaults to `1`. */
  page?: number;
  /** The number of rows to read, from 1 to 100. Defaults to `100`. */
  pageSize?: number;
  /** The column used to order rows. Defaults to `_id`. */
  orderBy?: string;
  /** Whether to sort in ascending order. Defaults to `true`. */
  ascending?: boolean;
  /** Exact and range conditions joined using AND. Each column condition must contain at least one operator. */
  where?: TableWhere;
}

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
 * @param _id The identifier of the row to read.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns The stored value or `null` if the table or row is not found.
 * @throws If the RPC call fails.
 */
export async function tryReadTable<Row extends TableRow = TableRow>(name: string, _id: string, rpcConfig?: RpcConfig): Promise<Row | null> {
  name = normalizeName(name, '#');
  return rpc<Row>('tryReadTable', { name, _id }, rpcConfig);
}

/**
 * Reads one ordered page of rows from a table.
 * @param name The name of the table to read from.
 * @param options Pagination, ordering, and filtering options. All `where` conditions are combined using AND.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns The requested page. Each row includes `_id` and `_updatedAt` system fields.
 * @throws If pagination, ordering, or filtering is invalid, or if the RPC call fails.
 */
export async function readTablePage<Row extends TableRow = TableRow>(
  name: string,
  options: ReadTablePageOptions = {},
  rpcConfig?: RpcConfig
): Promise<TablePage<Row>> {
  name = normalizeName(name, '#');
  return rpc<TablePage<Row>>(
    'readTablePage',
    {
      name,
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 100,
      orderBy: options.orderBy ?? '_id',
      ascending: options.ascending ?? true,
      where: options.where
    },
    rpcConfig
  );
}

/**
 * Writes a value to a table row, creating the table if needed and inserting or updating the row by primary key.
 * @param name The name of the table to write to.
 * @param row The identifier and user-defined columns to write. AilaFlow overrides `_updatedAt` when supplied.
 * @param rpcConfig Optional configuration for the RPC call.
 * @throws If the table name or row schema is invalid, or if the RPC call fails.
 */
export async function writeTable(name: string, row: TableRowInput, rpcConfig?: RpcConfig): Promise<void> {
  name = normalizeName(name, '#');
  return rpc<void>('writeTable', { name, row }, rpcConfig);
}

/**
 * Logs a message to the process logs.
 * @param texts The texts to log. They will be concatenated with spaces.
 */
export function log(...texts: unknown[]) {
  const items = texts.map(t => (typeof t === 'string' ? t : JSON.stringify(t)));
  process.stdout.write(items.join(' ') + '\n');
}

/**
 * Returns the name of the user who started the process with the '@' prefix.
 * @returns The name of the user who started the process.
 */
export async function getStartedBy(): Promise<string> {
  const name = await rpc<string>('getStartedBy', {});
  return '@' + name;
}

/**
 * Returns whether the current process is executed in test mode.
 * @returns `true` if the current process is executed in test mode, `false` otherwise.
 */
export async function isTest(rpcConfig?: RpcConfig): Promise<boolean> {
  return rpc<boolean>('isTest', {}, rpcConfig);
}

/**
 * Checks whether a user exists.
 * @param name The name of the user to check.
 * @param rpcConfig Optional configuration for the RPC call.
 * @returns Whether the user exists.
 * @throws If the RPC call fails.
 */
export function userExists(name: string, rpcConfig?: RpcConfig): Promise<boolean> {
  name = normalizeName(name, '@');
  return rpc<boolean>('userExists', { name }, rpcConfig);
}

function normalizeName(name: string, prefix: string): string {
  if (name.startsWith(prefix)) {
    return name.substring(1);
  }
  return name;
}
