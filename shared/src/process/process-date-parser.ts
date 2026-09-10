export class ProcessDateParser {
  public static parse(value: string): Date | null {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return null;
    }

    // Numeric values represent milliseconds since the Unix epoch.
    const timestamp = Number(trimmedValue);
    const date = new Date(Number.isNaN(timestamp) ? trimmedValue : timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  public static validate(value: string): string | null {
    if (!value.trim()) {
      return 'Value is empty';
    }
    return ProcessDateParser.parse(value) === null ? 'Invalid date' : null;
  }
}
