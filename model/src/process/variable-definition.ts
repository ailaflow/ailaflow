import z from 'zod/v4';

export const jsonSchema = z.record(z.string(), z.unknown());

export const jsonSchemaWithHash = z.object({
  schema: jsonSchema,
  hash: z.string()
});

export const variableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: jsonSchemaWithHash
});

export type JsonSchema = z.infer<typeof jsonSchema>;
export type JsonSchemaWithHash = z.infer<typeof jsonSchemaWithHash>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;
