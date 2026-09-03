export class ProcessCronJobExpressionValidator {
  public static validate(expression: string, timeZone: string): string | null {
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
}
