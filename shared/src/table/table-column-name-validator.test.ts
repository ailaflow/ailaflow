import assert from 'node:assert/strict';
import test from 'node:test';
import { TableColumnNameValidator } from './table-column-name-validator';

test('accepts simple lowercase column names', () => {
  assert.equal(TableColumnNameValidator.validate('_id'), null);
  assert.equal(TableColumnNameValidator.validate('_updatedAt'), null);
  assert.equal(TableColumnNameValidator.validate('x'), null);
  assert.equal(TableColumnNameValidator.validate('customer_name'), null);
  assert.equal(TableColumnNameValidator.validate('value2'), null);
});

test('rejects non-system underscore and non-simple column names', () => {
  assert.equal(TableColumnNameValidator.validate('_other'), 'Column name "_other" is not allowed to start with an underscore');
  assert.equal(TableColumnNameValidator.validate('Customer'), 'Column name "Customer" contains invalid characters');
  assert.equal(TableColumnNameValidator.validate('first-name'), 'Column name "first-name" contains invalid characters');
  assert.equal(TableColumnNameValidator.validate(''), 'Column name "" contains invalid characters');
});
