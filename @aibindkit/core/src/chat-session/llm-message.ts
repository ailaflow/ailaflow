import type { ToolCall } from '../tools/tool-call';

// These types must remain compatible with the OpenAI Chat Completions protocol.

export interface LlmTextContentPart {
  type: 'text';
  text: string;
}

export interface LlmRefusalContentPart {
  refusal: string;
  type: 'refusal';
}

export interface LlmImageContentPart {
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
  type: 'image_url';
}

export interface LlmInputAudioContentPart {
  input_audio: {
    data: string;
    format: 'wav' | 'mp3';
  };
  type: 'input_audio';
}

export interface LlmFileContentPart {
  file: {
    file_data?: string;
    file_id?: string;
    filename?: string;
  };
  type: 'file';
}

export type LlmUserContentPart = LlmTextContentPart | LlmImageContentPart | LlmInputAudioContentPart | LlmFileContentPart;

export interface LlmFunctionCall {
  arguments: string;
  name: string;
}

export interface LlmCustomToolCall {
  id: string;
  custom: {
    input: string;
    name: string;
  };
  type: 'custom';
}

export type LlmMessageToolCall = ToolCall | LlmCustomToolCall;

export interface LlmDeveloperMessage {
  role: 'developer';
  content: string | LlmTextContentPart[];
  name?: string;
}

export interface LlmSystemMessage {
  role: 'system';
  content: string | LlmTextContentPart[];
  name?: string;
}

export interface LlmUserMessage {
  role: 'user';
  content: string | LlmUserContentPart[];
  name?: string;
}

export interface LlmAssistantMessage {
  role: 'assistant';
  audio?: {
    id: string;
  } | null;
  content?: string | (LlmTextContentPart | LlmRefusalContentPart)[] | null;
  function_call?: LlmFunctionCall | null;
  name?: string;
  refusal?: string | null;
  tool_calls?: LlmMessageToolCall[];
}

export interface LlmToolMessage {
  role: 'tool';
  content: string | LlmTextContentPart[];
  tool_call_id: string;
}

/**
 * Kept for compatibility with chat histories created through the deprecated
 * function-calling API.
 */
export interface LlmFunctionMessage {
  role: 'function';
  content: string | null;
  name: string;
}

export type LlmMessage =
  | LlmDeveloperMessage
  | LlmSystemMessage
  | LlmUserMessage
  | LlmAssistantMessage
  | LlmToolMessage
  | LlmFunctionMessage;

export interface LlmCompletionUsage {
  completion_tokens: number;
  prompt_tokens: number;
  total_tokens: number;
  completion_tokens_details?: {
    accepted_prediction_tokens?: number;
    audio_tokens?: number;
    reasoning_tokens?: number;
    rejected_prediction_tokens?: number;
  };
  prompt_tokens_details?: {
    audio_tokens?: number;
    cached_tokens?: number;
  };
}
