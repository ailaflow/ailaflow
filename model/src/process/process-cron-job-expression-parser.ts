import { Cron } from 'croner';

export class ProcessCronJobExpressionParser {
  public static validate(expression: string, timeZone: string): string | null {
    try {
      this.create(expression, timeZone).nextRun();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  public static getNextExecutionAt(expression: string, timeZone: string, after: number): number {
    const nextRun = this.create(expression, timeZone).nextRun(new Date(after));
    if (!nextRun) {
      throw new Error('Cron expression has no future execution');
    }
    return nextRun.getTime();
  }

  private static create(expression: string, timeZone: string): Cron {
    const normalizedExpression = expression.trim();
    if (normalizedExpression.split(/\s+/).length !== 5) {
      throw new Error('Cron expression must contain exactly five fields');
    }
    if (!timeZone.trim()) {
      throw new Error('Time zone is required');
    }

    return new Cron(normalizedExpression, {
      mode: '5-part',
      paused: true,
      timezone: timeZone.trim()
    });
  }
}
