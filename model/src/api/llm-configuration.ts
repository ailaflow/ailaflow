import * as z from 'zod/v4';
import { LlmProviderType, LlmUseCase } from '../configuration/llm';

// common

export const llmProviderTypeSchema = z.union([
  z.literal(LlmProviderType.OPENAI),
  z.literal(LlmProviderType.ANTHROPIC),
  z.literal(LlmProviderType.OPENAI_COMPATIBLE),
  z.literal(LlmProviderType.CODEX_APP_SERVER)
]);

export const llmUseCaseSchema = z.union([
  z.literal(LlmUseCase.ADMIN_CHAT),
  z.literal(LlmUseCase.USER_CHAT),
  z.literal(LlmUseCase.AGENT_STEP)
]);

export const llmModelSchema = z.object({
  name: z.string(),
  contextWindow: z.number().int().positive().optional()
});
export type LlmModelDto = z.infer<typeof llmModelSchema>;

// getLlmConfiguration

export const llmProviderDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: llmProviderTypeSchema,
  url: z.string().nullable(),
  hasApiKey: z.boolean(),
  models: z.array(llmModelSchema)
});
export type LlmProviderDto = z.infer<typeof llmProviderDtoSchema>;

const llmUseCaseConfigurationDtoSchema = z.object({
  useCase: llmUseCaseSchema,
  providerId: z.string(),
  modelName: z.string(),
  modelContextWindow: z.number().int().positive().optional(),
  effectiveContextWindowPercent: z.number().int().min(1).max(100)
});

export const getLlmConfigurationResponseSchema = z.object({
  providers: z.array(llmProviderDtoSchema),
  useCases: z.array(llmUseCaseConfigurationDtoSchema)
});
export type GetLlmConfigurationResponse = z.infer<typeof getLlmConfigurationResponseSchema>;

// saveLlmProvider

export const saveLlmProviderRequestSchema = z.object({
  insert: z.boolean(),
  id: z.string().min(1),
  name: z.string(),
  type: llmProviderTypeSchema,
  url: z.string().nullable(),
  apiKey: z.string().nullable(),
  models: z.array(llmModelSchema)
});
export type SaveLlmProviderRequest = z.infer<typeof saveLlmProviderRequestSchema>;

// fetchLlmProviderModels

export const fetchLlmProviderModelsRequestSchema = z.object({
  id: z.string().optional(),
  type: llmProviderTypeSchema,
  url: z.string().nullable(),
  apiKey: z.string().nullable()
});
export type FetchLlmProviderModelsRequest = z.infer<typeof fetchLlmProviderModelsRequestSchema>;

export const fetchLlmProviderModelsResponseSchema = z.object({
  models: z.array(llmModelSchema)
});
export type FetchLlmProviderModelsResponse = z.infer<typeof fetchLlmProviderModelsResponseSchema>;

// deleteLlmProvider

export const deleteLlmProviderResponseSchema = z.object({
  id: z.string()
});
export type DeleteLlmProviderResponse = z.infer<typeof deleteLlmProviderResponseSchema>;

// saveLlmUseCaseAssignments

export const saveLlmUseCaseAssignmentsRequestSchema = z.object({
  assignments: z.array(
    z.object({
      useCase: llmUseCaseSchema,
      providerId: z.string().nullable(),
      modelName: z.string().nullable(),
      modelContextWindow: z.number().int().positive().optional(),
      effectiveContextWindowPercent: z.number().int().min(1).max(100)
    })
  )
});
export type SaveLlmUseCaseAssignmentsRequest = z.infer<typeof saveLlmUseCaseAssignmentsRequestSchema>;
