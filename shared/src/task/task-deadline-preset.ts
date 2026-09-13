import * as z from 'zod/v4';

export const taskDeadlinePresetSchema = z.enum({
  ONE_MINUTE: 'one_minute',
  FIVE_MINUTES: 'five_minutes',
  TEN_MINUTES: 'ten_minutes',
  THIRTY_MINUTES: 'thirty_minutes',
  ONE_HOUR: 'one_hour',
  ONE_DAY: 'one_day'
});

export const TaskDeadlinePreset = taskDeadlinePresetSchema.enum;
export type TaskDeadlinePreset = z.infer<typeof taskDeadlinePresetSchema>;

export class TaskDeadlinePresetEvaluator {
  public static evaluate(preset: TaskDeadlinePreset | string): number {
    switch (preset) {
      case 'one_minute':
        return 60 * 1000;
      case 'five_minutes':
        return 5 * 60 * 1000;
      case 'ten_minutes':
        return 10 * 60 * 1000;
      case 'thirty_minutes':
        return 30 * 60 * 1000;
      case 'one_hour':
        return 60 * 60 * 1000;
      case 'one_day':
        return 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown deadline preset: ${preset}`);
    }
  }
}
