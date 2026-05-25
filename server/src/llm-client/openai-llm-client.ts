import OpenAI from 'openai';
import { CompletedMessage } from './types/completed-message';
import { ToolDescriptor } from './types/tool-descriptor';
import { CompleteResult, LlmClient } from './llm-client';

export class OpenaiLlmClient implements LlmClient {
  private readonly openai: OpenAI;

  public constructor() {
    this.openai = new OpenAI({
      baseURL: process.env.AI_PROVIDER_BASE_URL!,
      apiKey: process.env.AI_PROVIDER_API_KEY!
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

    const completedMessage: CompletedMessage = {
      role: 'assistant',
      tool_calls: choice.message.tool_calls,
      content: choice.message.content
        ? [
            {
              type: 'text',
              text: choice.message.content
            }
          ]
        : undefined
    };

    return { completedMessage, totalTokens: response.usage?.total_tokens };
  }
}
