import { JsonSchema } from '../process';
import * as z from 'zod/v4';

export const taskCompletionMetadataSchema = z.object({
  status: z.enum(['completed', 'deadline_occurred']),
  items: z.array(
    z.object({
      time: z.number(),
      userName: z.string()
    })
  )
});

const taskCompletionMetadataSchemaJson = JSON.stringify(
  taskCompletionMetadataSchema.toJSONSchema({
    target: 'json-schema'
  })
);
export type TaskCompletionMetadata = z.infer<typeof taskCompletionMetadataSchema>;

export class TaskCompletionMetadataSchemaValidator {
  public static validate(schema: JsonSchema): string | null {
    // TODO: this is a very strict check
    if (JSON.stringify(schema) !== taskCompletionMetadataSchemaJson) {
      return 'Schema does not match the expected task completion metadata schema: ' + taskCompletionMetadataSchemaJson;
    }
    return null;
  }
}
