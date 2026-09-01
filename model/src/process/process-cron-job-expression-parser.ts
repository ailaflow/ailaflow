import { CronExpressionParser } from 'cron-parser';

export class ProcessCronJobExpressionParser {
  public static validate(expression: string, timeZone: string): string | null {
    try {
      this.parse(expression, timeZone, Date.now());
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  public static getNextExecutionAt(expression: string, timeZone: string, after: number): number {
    return this.parse(expression, timeZone, after).next().getTime();
  }

  private static parse(expression: string, timeZone: string, currentDate: number) {
    const normalizedExpression = expression.trim();
    if (normalizedExpression.split(/\s+/).length !== 5) {
      throw new Error('Cron expression must contain exactly five fields');
    }
    if (!timeZone.trim()) {
      throw new Error('Time zone is required');
    }

    return CronExpressionParser.parse(normalizedExpression, {
      currentDate,
      tz: timeZone.trim()
    });
  }
}
