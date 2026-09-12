import assert from 'node:assert/strict';
import test from 'node:test';
import { TableRowValidator } from './table-row-validator';

test('accepts scalar and JSON column values', () => {
  assert.equal(
    TableRowValidator.validate({
      _id: 'customer_1',
      name: 'Alice',
      score: 1.5,
      active: true,
      details: { tags: ['new'], optional: null }
    }),
    null
  );
});

test('accepts undefined as an omitted column and rejects top-level null', () => {
  assert.equal(TableRowValidator.validate({ _id: 'customer_1', optional: undefined }), null);
  assert.equal(TableRowValidator.validate({ _id: 'customer_1', optional: null }), 'Column "optional" is not allowed to have a null value');
});

test('ignores backend-owned _updatedAt and rejects invalid column names', () => {
  assert.equal(TableRowValidator.validate({ _id: 'x', _updatedAt: 'ignored' }), null);
  assert.equal(TableRowValidator.validate({ _id: 'x', _other: 1 }), 'Column name "_other" is not allowed to start with an underscore');
  assert.equal(TableRowValidator.validate({ _id: 'x', Invalid: 'x' }), 'Column name "Invalid" contains invalid characters');
});

test('requires a string _id', () => {
  assert.equal(TableRowValidator.validate({}), 'Table row must contain "_id" as a string');
  assert.equal(TableRowValidator.validate({ _id: 1 }), 'Table row must contain "_id" as a string');
});

test('validates scalar columns without inspecting JSON contents', () => {
  assert.equal(
    TableRowValidator.validate({ _id: 'customer_1', value: Number.NaN }),
    'Column "value" is not allowed to contain a non-finite number'
  );
  assert.equal(TableRowValidator.validate({ _id: 'customer_1', value: { nested: undefined, number: Number.NaN } }), null);

  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.equal(TableRowValidator.validate({ _id: 'customer_1', value: circular }), null);
});
