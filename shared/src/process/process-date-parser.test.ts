import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessDateParser } from './process-date-parser';

test('parses numeric timestamps as milliseconds, including zero and negative values', () => {
  for (const timestamp of [0, -1, 1788609600000]) {
    assert.equal(ProcessDateParser.parse(String(timestamp))?.getTime(), timestamp);
    assert.equal(ProcessDateParser.validate(String(timestamp)), null);
  }
});

test('parses date strings with UTC and explicit offsets as the same instant', () => {
  for (const value of ['2026-09-05T12:00:00Z', '2026-09-05T14:00:00+02:00', 'Sat, 05 Sep 2026 12:00:00 GMT']) {
    assert.equal(ProcessDateParser.parse(value)?.toISOString(), '2026-09-05T12:00:00.000Z');
    assert.equal(ProcessDateParser.validate(value), null);
  }
});

test('ignores surrounding whitespace', () => {
  assert.equal(ProcessDateParser.parse(' 0 ')?.getTime(), 0);
  assert.equal(ProcessDateParser.parse(' 2026-09-05T12:00:00Z ')?.toISOString(), '2026-09-05T12:00:00.000Z');
});

test('rejects empty and whitespace-only values', () => {
  for (const value of ['', ' ', '\t\n']) {
    assert.equal(ProcessDateParser.parse(value), null);
    assert.equal(ProcessDateParser.validate(value), 'Value is empty');
  }
});

test('rejects invalid date strings and timestamps outside the Date range', () => {
  for (const value of ['not a date', '2026-13-01T00:00:00Z', 'NaN', 'Infinity', '-Infinity', '1e309', '8640000000000001']) {
    assert.equal(ProcessDateParser.parse(value), null, value);
    assert.equal(ProcessDateParser.validate(value), 'Invalid date', value);
  }
});
