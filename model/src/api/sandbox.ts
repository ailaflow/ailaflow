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
  secrets: z.record(z.string(), z.string())
});

export const getSandboxResponseSchema = z.object({
  sandbox: sandboxDtoSchema
});

export type SandboxDto = z.infer<typeof sandboxDtoSchema>;
export type GetSandboxResponse = z.infer<typeof getSandboxResponseSchema>;

// diagnoseHost

export const diagnoseHostResponseSchema = z.object({
  dockerVersion: z.string().nullable(),
  isAppFolderReadable: z.boolean(),
  isDataFolderWritable: z.boolean()
});

export type DiagnoseHostResponse = z.infer<typeof diagnoseHostResponseSchema>;

// upsertSandbox

export const upsertSandboxRequestSchema = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  secrets: z.record(z.string(), z.string())
});

export type UpsertSandboxRequest = z.infer<typeof upsertSandboxRequestSchema>;

// executeSandboxCommand

export const executeSandboxCommandRequestSchema = z.object({
  cwd: z.string().min(1),
  command: z.string().min(1)
});

export type ExecuteSandboxCommandRequest = z.infer<typeof executeSandboxCommandRequestSchema>;

export interface ExecuteSandboxCommandUpdate {
  stdout?: string;
  stderr?: string;
  error?: string;
  result?: {
    code: number;
    signal: string | null;
  };
}
