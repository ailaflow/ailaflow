import z from 'zod';
import { ProcessDefinition, ProcessDefinitionValidator } from '../process';

// getProcesses

const processLiteDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  userList: z.string()
});

export const getProcessesResponse = z.object({
  processes: z.array(processLiteDto)
});

export type ProcessLiteDto = z.infer<typeof processLiteDto>;
export type GetProcessesResponse = z.infer<typeof getProcessesResponse>;

// getProcess

const processDto = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  userList: z.string(),
  definition: z.custom<ProcessDefinition>()
});

export const getProcessResponse = z.object({
  process: processDto
});

export type ProcessDto = z.infer<typeof processDto>;
export type GetProcessResponse = z.infer<typeof getProcessResponse>;

// updateProcess

export const updateProcessRequest = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  userList: z.string(),
  definition: z.custom<ProcessDefinition>(d => {
    if (typeof d === 'object' && d !== null) {
      const definition = d as ProcessDefinition;
      return ProcessDefinitionValidator.validateRoot(definition);
    }
    return false;
  })
});
export const updateProcessResponse = z.object({
  id: z.string()
});

export type UpdateProcessRequest = z.infer<typeof updateProcessRequest>;
export type UpdateProcessResponse = z.infer<typeof updateProcessResponse>;
