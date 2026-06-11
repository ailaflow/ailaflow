import { Definition } from 'sequential-workflow-model';
import z from 'zod/v4';

export const jsonSchemaSchema = z.object({
  type: z.string(),
  properties: z.record(z.string(), z.unknown()).optional()
});

export const variableDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input: z.boolean(),
  output: z.boolean(),
  schema: jsonSchemaSchema
});

export type JsonSchema = z.infer<typeof jsonSchemaSchema>;
export type VariableDefinition = z.infer<typeof variableDefinitionSchema>;

export interface ProcessDefinition extends Definition {
  properties: {
    inputForm?: object;
    outputForm?: object;
    variables: VariableDefinition[];
  };
}
