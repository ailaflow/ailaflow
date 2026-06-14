import z from 'zod/v4';

export const formInputExampleSchema = z.object({
  variableName: z.string(),
  exampleValue: z.string().optional()
});

export const formDefinitionSchema = z
  .object({
    inputExamples: z.array(formInputExampleSchema),
    css: z.string(),
    html: z.string(),
    js: z.string()
  })
  .describe('A form definition.');

export type FormInputExample = z.infer<typeof formInputExampleSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;
