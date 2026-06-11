import z from 'zod';

// getSandboxes

const sandboxLiteDto = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string()
});

export const getSandboxesResponse = z.object({
  sandboxes: z.array(sandboxLiteDto)
});

export type SandboxLiteDto = z.infer<typeof sandboxLiteDto>;
export type GetSandboxesResponse = z.infer<typeof getSandboxesResponse>;

// getSandbox

const sandboxDto = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string())
});

export const getSandboxResponse = z.object({
  sandbox: sandboxDto
});

export type SandboxDto = z.infer<typeof sandboxDto>;
export type GetSandboxResponse = z.infer<typeof getSandboxResponse>;

// upsertSandbox

export const upsertSandboxRequest = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string()),
  hash: z.string()
});

export type UpsertSandboxRequest = z.infer<typeof upsertSandboxRequest>;
