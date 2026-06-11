import z from 'zod/v4';

// getSandboxes

const sandboxLiteDtoSchema = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string()
});

export const getSandboxesResponseSchema = z.object({
  sandboxes: z.array(sandboxLiteDtoSchema)
});

export type SandboxLiteDto = z.infer<typeof sandboxLiteDtoSchema>;
export type GetSandboxesResponse = z.infer<typeof getSandboxesResponseSchema>;

// getSandbox

const sandboxDtoSchema = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string())
});

export const getSandboxResponseSchema = z.object({
  sandbox: sandboxDtoSchema
});

export type SandboxDto = z.infer<typeof sandboxDtoSchema>;
export type GetSandboxResponse = z.infer<typeof getSandboxResponseSchema>;

// upsertSandbox

export const upsertSandboxRequestSchema = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string()),
  hash: z.string()
});

export type UpsertSandboxRequest = z.infer<typeof upsertSandboxRequestSchema>;
