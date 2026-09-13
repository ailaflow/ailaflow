import { taskDeadlinePresetSchema } from './task-deadline-preset';

export class TaskDeadlinePresetValidator {
  public static validate(preset: string): string | null {
    const result = taskDeadlinePresetSchema.safeParse(preset);
    return result.success ? null : `Invalid deadline preset: ${result.error.message}`;
  }
}
