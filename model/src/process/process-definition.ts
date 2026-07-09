import { formDefinitionSchema } from './form-definition';
import { variableDefinitionSchema } from './variable-definition';
import z from 'zod/v4';
import { sequenceSchema } from './process-steps';

export const processDefinitionPropertiesSchema = z.object({
  startForm: formDefinitionSchema.optional(),
  startVariableNames: z.array(z.string()),
  variables: z.array(variableDefinitionSchema)
});

export const processDefinitionSchema = z.object({
  properties: processDefinitionPropertiesSchema,
  sequence: sequenceSchema
});

export type ProcessDefinitionProperties = z.infer<typeof processDefinitionPropertiesSchema>;
export type ProcessDefinition = z.infer<typeof processDefinitionSchema>;
