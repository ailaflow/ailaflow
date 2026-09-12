import { TableColumnType, TableSchemaError } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { TableSchema } from './table-schema';

test('extends an immutable schema only when new columns are found', () => {
  const schema = new TableSchema('customers', [{ name: 'name', type: TableColumnType.STRING }]);

  assert.equal(schema.tryExtend({ _id: 'customer_1', _updatedAt: 1, name: 'Alice', omitted: undefined }), null);

  const extended = schema.tryExtend({ _id: 'customer_1', name: 'Alice', score: 1, active: true, details: { tags: ['new'] } });
  assert.ok(extended);
  assert.deepEqual(schema.columns, [{ name: 'name', type: TableColumnType.STRING }]);
  assert.deepEqual(extended.newColumns, [
    { name: 'score', type: TableColumnType.NUMBER },
    { name: 'active', type: TableColumnType.BOOLEAN },
    { name: 'details', type: TableColumnType.JSON }
  ]);
  assert.equal(extended.asPersisted().newColumns.length, 0);
});

test('rejects a value that changes an established column type', () => {
  const schema = new TableSchema('customers', [{ name: 'score', type: TableColumnType.NUMBER }]);

  assert.throws(
    () => schema.tryExtend({ _id: 'customer_1', score: 'one' }),
    error => error instanceof TableSchemaError && error.message === 'Column "score" expects type NUMBER but received STRING'
  );
});

test('treats arrays and objects as the same JSON column type', () => {
  const schema = new TableSchema('customers', [{ name: 'details', type: TableColumnType.JSON }]);

  assert.equal(schema.tryExtend({ _id: 'customer_1', details: ['one'] }), null);
  assert.equal(schema.tryExtend({ _id: 'customer_1', details: { key: 'value' } }), null);
});
