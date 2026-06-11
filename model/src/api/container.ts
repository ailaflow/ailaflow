import z from 'zod';

// getContainers

const containerLiteDto = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string()
});

export const getContainersResponse = z.object({
  containers: z.array(containerLiteDto)
});

export type ContainerLiteDto = z.infer<typeof containerLiteDto>;
export type GetContainersResponse = z.infer<typeof getContainersResponse>;

// getContainer

const containerDto = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string())
});

export const getContainerResponse = z.object({
  container: containerDto
});

export type ContainerDto = z.infer<typeof containerDto>;
export type GetContainerResponse = z.infer<typeof getContainerResponse>;

// upsertContainer

export const upsertContainerRequest = z.object({
  name: z.string(),
  isEnabled: z.boolean(),
  description: z.string(),
  configuration: z.string(),
  envVariables: z.record(z.string(), z.string()),
  hash: z.string()
});

export type UpsertContainerRequest = z.infer<typeof upsertContainerRequest>;
