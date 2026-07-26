import OpenAI from 'openai';
import { LlmCompleteResult, LlmClient } from './llm-client';
import type { LlmMessage, ToolDescriptor } from '@aibindkit/core';

export class OpenaiLlmClient implements LlmClient {
  private readonly openai: OpenAI;

  public constructor(config: { baseUrl: string; apiKey: string }) {
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey
    });
  }

  public async complete(
    abortSignal: AbortSignal,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult> {
    const response = await this.openai.chat.completions.create(
      {
        tools: toolDescriptors,
        model: 'openai/gpt-oss-120b',
        stream: false,
        messages
      },
      {
        signal: abortSignal
      }
    );

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices returned from AI API');
    }

    const message: LlmMessage = choice.message;

    return { message, totalTokens: response.usage?.total_tokens };
  }
}
