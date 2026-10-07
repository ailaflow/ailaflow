export class ProcessCronJobValidator {
  public static validateExpression(expression: string, timeZone: string): string | null {
    if (expression.trim().split(/\s+/).length !== 5) {
      return 'Cron expression must contain exactly five fields';
    }
    if (!timeZone.trim()) {
      return 'Time zone is required';
    }

    try {
      new Intl.DateTimeFormat('en', { timeZone: timeZone.trim() }).format();
      return null;
    } catch {
      return 'Invalid time zone';
    }
  }

  public static validateMaxExecutionTime(time: number): string | null {
    if (!Number.isInteger(time) || time <= 0 || time > 86_400) {
      return 'Max execution time must be an integer greater than 0 and less than or equal to 86400';
    }
    return null;
  }
}
