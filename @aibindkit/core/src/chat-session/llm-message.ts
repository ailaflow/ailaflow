import type OpenAI from 'openai';

export type LlmMessage = OpenAI.Chat.ChatCompletionMessageParam;

export type LlmCompletionUsage = OpenAI.CompletionUsage;
