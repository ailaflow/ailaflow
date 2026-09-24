import * as z from 'zod/v4';

export const stepPropertiesSchema = z.record(z.string(), z.unknown()).describe('The properties of the step');

export const baseStepSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe('The unique identifier of the step')
    .regex(/^[\w-]+$/, 'Step ID contains forbidden character'),
  name: z.string().describe('The name of the step'),
  type: z.string().describe('The type of the step'),
  componentType: z.string().describe('The component of the step')
});

export type BaseStepSchema = z.infer<typeof baseStepSchema>;
