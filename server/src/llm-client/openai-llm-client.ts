import OpenAI from 'openai';
import { CompleteResult, LlmClient } from './llm-client';
import type { ToolDescriptor } from '@aibindkit/model';
import { CompletedMessage } from '@aila/model';

export class OpenaiLlmClient implements LlmClient {
  private readonly openai: OpenAI;

  public constructor() {
    this.openai = new OpenAI({
      baseURL: process.env.AI_PROVIDER_BASE_URL!,
      apiKey: process.env.AI_PROVIDER_API_KEY!
      /*fetch: async (input, init) => {
        const response = await fetch(input, init);
        const body = await response.clone().text();
        console.log('AI response:', body);
        return response;
      }*/
    });
  }

  public async complete(
    abortSignal: AbortSignal,
    completedMessages: CompletedMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<CompleteResult> {
    const response = await this.openai.chat.completions.create(
      {
        tools: toolDescriptors,
        model: 'openai/gpt-oss-120b',
        stream: false,
        messages: completedMessages
      },
      {
        signal: abortSignal
      }
    );

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No choices returned from AI API');
    }

    const completedMessage: CompletedMessage = choice.message;

    return { completedMessage, totalTokens: response.usage?.total_tokens };
  }
}
