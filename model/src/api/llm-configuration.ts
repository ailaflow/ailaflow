import z from 'zod/v4';
import { LlmProviderType } from '../llm-configuration/llm-provider-type';
import { LlmUseCase } from '../llm-configuration/llm-use-case';

// common

export const llmProviderTypeSchema = z.union([
  z.literal(LlmProviderType.OPENAI),
  z.literal(LlmProviderType.ANTHROPIC),
  z.literal(LlmProviderType.OPENAI_COMPATIBLE)
]);

export const llmUseCaseSchema = z.union([z.literal(LlmUseCase.ADMIN_CHAT), z.literal(LlmUseCase.USER_CHAT)]);

// getLlmConfiguration

export const llmProviderDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: llmProviderTypeSchema,
  baseUrl: z.string().nullable(),
  hasApiKey: z.boolean(),
  models: z.array(z.string())
});
export type LlmProviderDto = z.infer<typeof llmProviderDtoSchema>;

const llmUseCaseConfigurationDtoSchema = z.object({
  useCase: llmUseCaseSchema,
  providerId: z.string(),
  model: z.string()
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
  baseUrl: z.string().nullable(),
  apiKey: z.string().optional(),
  models: z.array(z.string())
});
export type SaveLlmProviderRequest = z.infer<typeof saveLlmProviderRequestSchema>;

// fetchLlmProviderModels

export const fetchLlmProviderModelsRequestSchema = z.object({
  id: z.string().optional(),
  type: llmProviderTypeSchema,
  baseUrl: z.string().nullable(),
  apiKey: z.string().optional()
});
export type FetchLlmProviderModelsRequest = z.infer<typeof fetchLlmProviderModelsRequestSchema>;

export const fetchLlmProviderModelsResponseSchema = z.object({
  models: z.array(z.string())
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
      model: z.string().nullable()
    })
  )
});
export type SaveLlmUseCaseAssignmentsRequest = z.infer<typeof saveLlmUseCaseAssignmentsRequestSchema>;
