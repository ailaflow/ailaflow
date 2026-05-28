import z from 'zod';

// install

export const installRequest = z.object({
  rootUserName: z.string(),
  rootPassword: z.string()
});
export const installResponse = z.object({
  error: z.string().optional()
});
export type InstallRequest = z.infer<typeof installRequest>;
export type InstallResponse = z.infer<typeof installResponse>;
