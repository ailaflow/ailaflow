import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessCronJobExpressionValidator } from './process-cron-job-expression-validator';

test('accepts a structurally valid five-field expression and time zone', () => {
  assert.equal(ProcessCronJobExpressionValidator.validate('0 9 * * *', 'Europe/Warsaw'), null);
});

test('rejects expressions that do not contain exactly five fields', () => {
  assert.equal(ProcessCronJobExpressionValidator.validate('0 */15 * * * *', 'UTC'), 'Cron expression must contain exactly five fields');
});

test('rejects missing and invalid time zones', () => {
  assert.equal(ProcessCronJobExpressionValidator.validate('0 9 * * *', '  '), 'Time zone is required');
  assert.equal(ProcessCronJobExpressionValidator.validate('0 9 * * *', 'Not/A_Time_Zone'), 'Invalid time zone');
});
