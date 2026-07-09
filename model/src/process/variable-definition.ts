import z from 'zod/v4';

export const jsonSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  hash: z.string()
});

export const variableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: jsonSchema
});

export type JsonSchema = z.infer<typeof jsonSchema>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;
