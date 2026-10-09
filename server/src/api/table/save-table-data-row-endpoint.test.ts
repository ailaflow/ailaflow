import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { TableRow, TableSchemaError } from '@ailaflow/shared';
import { Request } from 'express';
import { TableManager } from '../../table/table-manager';
import { EndpointError } from '../framework/endpoint-error';
import { SaveTableDataRowEndpoint } from './save-table-data-row-endpoint';

test('saves a table data row', async () => {
  const row: TableRow = { _id: 'customer_1', _updatedAt: 1000, name: 'Alice' };
  let saved: { tableName: string; row: TableRow } | null = null;
  const manager: Pick<TableManager, 'writeRow'> = {
    async writeRow(_signal, tableName, savedRow) {
      saved = { tableName, row: savedRow as TableRow };
    }
  };
  const endpoint = new SaveTableDataRowEndpoint(manager);

  assert.deepEqual(await endpoint.handle(createRequest('customers', { row })), {});
  assert.deepEqual(saved, { tableName: 'customers', row });
});

test('maps table schema errors to bad requests', async () => {
  const manager: Pick<TableManager, 'writeRow'> = {
    async writeRow() {
      throw new TableSchemaError('Column "score" expects type NUMBER but received STRING');
    }
  };
  const endpoint = new SaveTableDataRowEndpoint(manager);

  await assert.rejects(
    endpoint.handle(createRequest('customers', { row: { _id: 'customer_1', _updatedAt: 1000, score: 'invalid' } })),
    error =>
      error instanceof EndpointError && error.status === 400 && error.message === 'Column "score" expects type NUMBER but received STRING'
  );
});

function createRequest(name: string, body: unknown): Request {
  return Object.assign(new EventEmitter(), {
    params: { name },
    body
  }) as unknown as Request;
}
