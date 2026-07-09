import z from 'zod/v4';

export const stepPropertiesSchema = z.record(z.string(), z.unknown()).describe('The properties of the step');

export const stepSchema = z.object({
  id: z.string().min(1).describe('The unique identifier of the step'),
  name: z.string().describe('The name of the step'),
  type: z.string().describe('The type of the step'),
  componentType: z.string().describe('The component of the step')
});

export type StepSchema = z.infer<typeof stepSchema>;
