import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { Request } from 'express';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteTableRepository } from '../../repositories/table/sqlite-table-repository';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteTableEndpoint } from './delete-table-endpoint';
import { GetTableEndpoint } from './get-table-endpoint';
import { SaveTableEndpoint } from './save-table-endpoint';

test('creates, reads, updates, and deletes a table definition', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs);
  const saveEndpoint = new SaveTableEndpoint(repository);
  const getEndpoint = new GetTableEndpoint(repository);
  const deleteEndpoint = new DeleteTableEndpoint(repository);
  await repository.setup(abortSignal);

  assert.deepEqual(
    await saveEndpoint.handle(createRequest({ body: { insert: true, name: 'customers', description: 'Customer records' } })),
    { name: 'customers' }
  );
  assert.deepEqual(await getEndpoint.handle(createRequest({ name: 'customers' })), {
    table: { name: 'customers', description: 'Customer records' }
  });

  await saveEndpoint.handle(createRequest({ body: { insert: false, name: 'customers', description: 'Updated records' } }));
  assert.deepEqual(await getEndpoint.handle(createRequest({ name: 'customers' })), {
    table: { name: 'customers', description: 'Updated records' }
  });

  assert.deepEqual(await deleteEndpoint.handle(createRequest({ name: 'customers' })), { name: 'customers' });
  await assertEndpointError(() => getEndpoint.handle(createRequest({ name: 'customers' })), 404, 'Table not found');
  await assertEndpointError(() => deleteEndpoint.handle(createRequest({ name: 'customers' })), 404, 'Table not found');

  db.close();
});

test('rejects invalid, duplicate, and missing table saves', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTableRepository(dbs);
  const endpoint = new SaveTableEndpoint(repository);
  await repository.setup(abortSignal);

  await endpoint.handle(createRequest({ body: { insert: true, name: 'customers', description: '' } }));
  await assertEndpointError(
    () => endpoint.handle(createRequest({ body: { insert: true, name: 'customers', description: '' } })),
    400,
    'Table already exists'
  );
  await assertEndpointError(
    () => endpoint.handle(createRequest({ body: { insert: true, name: 'Invalid', description: '' } })),
    400,
    'Name contains invalid characters.'
  );
  await assertEndpointError(
    () => endpoint.handle(createRequest({ body: { insert: false, name: 'missing', description: '' } })),
    404,
    'Table not found'
  );

  db.close();
});

function createRequest(options: { name?: string; body?: unknown }): Request {
  return Object.assign(new EventEmitter(), {
    params: { name: options.name },
    body: options.body
  }) as unknown as Request;
}

async function assertEndpointError(action: () => Promise<unknown>, status: number, message: string): Promise<void> {
  await assert.rejects(action, error => error instanceof EndpointError && error.status === status && error.message === message);
}
