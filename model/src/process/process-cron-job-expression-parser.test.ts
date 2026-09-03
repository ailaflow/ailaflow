import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessCronJobExpressionParser } from './process-cron-job-expression-parser';

test('calculates the next execution using a five-field expression', () => {
  const next = ProcessCronJobExpressionParser.getNextExecutionAt('*/15 * * * *', 'UTC', Date.parse('2026-09-01T10:01:00Z'));
  assert.equal(next, Date.parse('2026-09-01T10:15:00Z'));
});

test('uses the requested time zone', () => {
  const next = ProcessCronJobExpressionParser.getNextExecutionAt('0 9 * * *', 'Europe/Warsaw', Date.parse('2026-09-01T06:00:00Z'));
  assert.equal(next, Date.parse('2026-09-01T07:00:00Z'));
});

test('preserves wall-clock scheduling across daylight-saving transitions', () => {
  const spring = ProcessCronJobExpressionParser.getNextExecutionAt('30 2 * * *', 'Europe/Warsaw', Date.parse('2026-03-28T23:00:00Z'));
  const autumn = ProcessCronJobExpressionParser.getNextExecutionAt('30 2 * * *', 'Europe/Warsaw', Date.parse('2026-10-24T23:00:00Z'));

  assert.equal(spring, Date.parse('2026-03-29T01:30:00Z'));
  assert.equal(autumn, Date.parse('2026-10-25T00:30:00Z'));
});

test('rejects expressions with seconds', () => {
  assert.equal(ProcessCronJobExpressionParser.validate('0 */15 * * * *', 'UTC'), 'Cron expression must contain exactly five fields');
});

test('rejects invalid expressions and time zones', () => {
  assert.match(ProcessCronJobExpressionParser.validate('invalid * * * *', 'UTC') ?? '', /illegal characters/i);
  assert.notEqual(ProcessCronJobExpressionParser.validate('0 9 * * *', 'Not/A_Time_Zone'), null);
});
