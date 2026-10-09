import { ProcessCronJobRun, ProcessCronJobValidator, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { randomUUID } from 'crypto';
import { ProcessCronJobExpressionParser } from './process-cron-job-expression-parser';
import { ProcessCronJobRepositoryError } from './process-cron-job-repository';

export class ProcessCronJob {
  public static create(
    processName: string,
    starterUserName: string,
    expression: string,
    timeZone: string,
    startValues: ProcessExecutionVariableValues,
    isEnabled: boolean,
    maxExecutionTime: number
  ): ProcessCronJob {
    validate(expression, timeZone, maxExecutionTime);
    return new ProcessCronJob(
      randomUUID(),
      processName,
      starterUserName,
      expression,
      timeZone,
      startValues,
      isEnabled,
      maxExecutionTime,
      calculateNextExecutionAt(expression, timeZone),
      null
    );
  }

  public constructor(
    public readonly id: string,
    public readonly processName: string,
    public starterUserName: string,
    public expression: string,
    public timeZone: string,
    public startValues: ProcessExecutionVariableValues,
    public isEnabled: boolean,
    public maxExecutionTime: number,
    public nextExecutionAt: number,
    public lastRun: ProcessCronJobRun | null
  ) {}

  public update(
    starterUserName: string,
    expression: string,
    timeZone: string,
    startValues: ProcessExecutionVariableValues,
    isEnabled: boolean,
    maxExecutionTime: number
  ): void {
    validate(expression, timeZone, maxExecutionTime);
    this.starterUserName = starterUserName;
    this.expression = expression;
    this.timeZone = timeZone;
    this.startValues = startValues;
    this.isEnabled = isEnabled;
    this.maxExecutionTime = maxExecutionTime;
    this.nextExecutionAt = calculateNextExecutionAt(expression, timeZone);
  }
}

function validate(expression: string, timeZone: string, maxExecutionTime: number): void {
  const error = ProcessCronJobExpressionParser.validate(expression, timeZone);
  if (error) {
    throw new ProcessCronJobRepositoryError(error);
  }
  const timeError = ProcessCronJobValidator.validateMaxExecutionTime(maxExecutionTime);
  if (timeError) {
    throw new ProcessCronJobRepositoryError(timeError);
  }
}

function calculateNextExecutionAt(expression: string, timeZone: string): number {
  return ProcessCronJobExpressionParser.getNextExecutionAt(expression, timeZone, Date.now());
}
