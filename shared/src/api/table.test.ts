import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableDataRequestSchema, getTableDataResponseSchema } from './table';

test('parses table page ordering options', () => {
  assert.deepEqual(getTableDataRequestSchema.parse({ page: '2', pageSize: '10', orderBy: 'score', ascending: 'false' }), {
    page: 2,
    pageSize: 10,
    orderBy: 'score',
    ascending: false
  });
});

test('validates flattened table rows', () => {
  assert.deepEqual(
    getTableDataResponseSchema.parse({
      rows: [{ _id: 'customer_1', _updatedAt: 1000, name: 'Alice' }],
      page: 1,
      pageSize: 100,
      hasMore: false
    }).rows,
    [{ _id: 'customer_1', _updatedAt: 1000, name: 'Alice' }]
  );
  assert.throws(() =>
    getTableDataResponseSchema.parse({
      data: [{ pk: 'customer_1', row: { name: 'Alice' }, updatedAt: 1000 }],
      page: 1,
      pageSize: 100,
      hasMore: false
    })
  );
});
