import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessCronJobValidator } from './process-cron-job-validator';

test('accepts a structurally valid five-field expression and time zone', () => {
  assert.equal(ProcessCronJobValidator.validateExpression('0 9 * * *', 'Europe/Warsaw'), null);
});

test('rejects expressions that do not contain exactly five fields', () => {
  assert.equal(ProcessCronJobValidator.validateExpression('0 */15 * * * *', 'UTC'), 'Cron expression must contain exactly five fields');
});

test('rejects missing and invalid time zones', () => {
  assert.equal(ProcessCronJobValidator.validateExpression('0 9 * * *', '  '), 'Time zone is required');
  assert.equal(ProcessCronJobValidator.validateExpression('0 9 * * *', 'Not/A_Time_Zone'), 'Invalid time zone');
});

test('validates max execution time', () => {
  assert.equal(ProcessCronJobValidator.validateMaxExecutionTime(60), null);
  assert.match(ProcessCronJobValidator.validateMaxExecutionTime(0) ?? '', /greater than 0/);
  assert.match(ProcessCronJobValidator.validateMaxExecutionTime(1.5) ?? '', /integer/);
  assert.match(ProcessCronJobValidator.validateMaxExecutionTime(86_401) ?? '', /less than or equal to 86400/);
});
