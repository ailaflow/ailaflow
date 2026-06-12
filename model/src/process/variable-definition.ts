import z from 'zod/v4';
import { JSONSchema } from 'zod/v4/core';

export const jsonSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.string(), z.unknown()).optional()
});

export const variableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input: z.boolean(),
  output: z.boolean(),
  schema: z.custom<JSONSchema.JSONSchema>()
});

export type JsonSchema = z.infer<typeof jsonSchemaSchema>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;
