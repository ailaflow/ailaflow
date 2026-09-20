import type { JsonSchema } from '../process';
import { taskCompletionMetadataSchema } from './task-completion-metadata';

const taskCompletionMetadataSchemaJson = JSON.stringify(
  taskCompletionMetadataSchema.toJSONSchema({
    target: 'json-schema'
  })
);

export class TaskCompletionMetadataSchemaValidator {
  public static validate(schema: JsonSchema): string | null {
    // TODO: this is a very strict check
    if (JSON.stringify(schema) !== taskCompletionMetadataSchemaJson) {
      return 'Schema does not match the expected task completion metadata schema: ' + taskCompletionMetadataSchemaJson;
    }
    return null;
  }
}
