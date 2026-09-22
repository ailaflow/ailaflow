import { ProcessCronJobRun, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { randomUUID } from 'crypto';
import { ProcessCronJobExpressionParser } from '../../crons/process-cron-job-expression-parser';
import { ProcessCronJobRepositoryError } from './process-cron-job-repository';

export class ProcessCronJob {
  public static create(
    processName: string,
    callerName: string,
    expression: string,
    timeZone: string,
    inputValues: ProcessExecutionVariableValues,
    isEnabled: boolean
  ): ProcessCronJob {
    validate(expression, timeZone);
    return new ProcessCronJob(
      randomUUID(),
      processName,
      callerName,
      expression,
      timeZone,
      inputValues,
      isEnabled,
      calculateNextExecutionAt(expression, timeZone),
      null
    );
  }

  public constructor(
    public readonly id: string,
    public readonly processName: string,
    public callerName: string,
    public expression: string,
    public timeZone: string,
    public inputValues: ProcessExecutionVariableValues,
    public isEnabled: boolean,
    public nextExecutionAt: number,
    public lastRun: ProcessCronJobRun | null
  ) {}

  public update(
    callerName: string,
    expression: string,
    timeZone: string,
    inputValues: ProcessExecutionVariableValues,
    isEnabled: boolean
  ): void {
    validate(expression, timeZone);
    this.callerName = callerName;
    this.expression = expression;
    this.timeZone = timeZone;
    this.inputValues = inputValues;
    this.isEnabled = isEnabled;
    this.nextExecutionAt = calculateNextExecutionAt(expression, timeZone);
  }
}

function validate(expression: string, timeZone: string): void {
  const error = ProcessCronJobExpressionParser.validate(expression, timeZone);
  if (error) {
    throw new ProcessCronJobRepositoryError(error);
  }
}

function calculateNextExecutionAt(expression: string, timeZone: string): number {
  return ProcessCronJobExpressionParser.getNextExecutionAt(expression, timeZone, Date.now());
}
