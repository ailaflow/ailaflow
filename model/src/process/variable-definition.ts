import z from 'zod/v4';
import { JSONSchema } from 'zod/v4/core';

export const jsonSchema = z.object({
  schema: z.custom<JSONSchema.JSONSchema>(),
  hash: z.string()
});

export const variableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: jsonSchema
});

export type JsonSchema = z.infer<typeof jsonSchema>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;
