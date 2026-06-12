import z from 'zod/v4';

export const formInputVariableSchema = z.object({
  name: z.string(),
  testValue: z.string().optional()
});

export const formOutputVariableSchema = z.object({
  name: z.string()
});

export const formDefinitionSchema = z
  .object({
    inputVariables: z.array(formInputVariableSchema).optional(),
    outputVariables: z.array(formOutputVariableSchema).optional(),
    css: z.string(),
    html: z.string(),
    js: z.string()
  })
  .describe('A form definition.');

export type FormInputVariable = z.infer<typeof formInputVariableSchema>;
export type FormOutputVariable = z.infer<typeof formOutputVariableSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;
