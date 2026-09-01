import { ProcessCronJobExpressionParser, ProcessCronJobRun, ProcessExecutionVariableValues } from '@aila/model';
import { randomBytes } from 'crypto';
import { ProcessCronJobRepositoryError } from './process-cron-job-repository';

export class ProcessCronJob {
  public static create(
    processName: string,
    expression: string,
    timeZone: string,
    inputValues: ProcessExecutionVariableValues,
    isEnabled: boolean
  ): ProcessCronJob {
    validate(expression, timeZone);
    return new ProcessCronJob(
      randomBytes(24).toString('hex'),
      processName,
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
    public expression: string,
    public timeZone: string,
    public inputValues: ProcessExecutionVariableValues,
    public isEnabled: boolean,
    public nextExecutionAt: number,
    public lastRun: ProcessCronJobRun | null
  ) {}

  public update(expression: string, timeZone: string, inputValues: ProcessExecutionVariableValues, isEnabled: boolean): void {
    validate(expression, timeZone);
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
