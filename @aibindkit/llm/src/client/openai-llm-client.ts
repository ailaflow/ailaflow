import type { LlmAssistantMessage, LlmCompletionUsage, LlmMessage, Logger, ToolDescriptor } from '@aibindkit/core';
import { LlmCompleteResult, LlmClient, LlmClientError, LlmModel, LlmModelSettings } from './llm-client';
import { LlmMessageSanitizer } from './llm-message-sanitizer';
import { RetryableHttpClient } from './retryable-http-client';

interface OpenaiErrorResponse {
  error?: {
    message?: string;
  };
}

interface OpenaiChatCompletionResponse extends OpenaiErrorResponse {
  choices?: Array<{
    message?: LlmAssistantMessage;
  }>;
  usage?: LlmCompletionUsage;
}

interface OpenaiModelsResponse extends OpenaiErrorResponse {
  data?: Array<{
    id?: unknown;
    context_window?: unknown;
    context_length?: unknown;
  }>;
}

const defaultMaxRetries = 2;

export class OpenaiLlmClient implements LlmClient {
  private readonly sanitizer = new LlmMessageSanitizer();
  private readonly httpClient: RetryableHttpClient;
  private readonly baseUrl: string;

  public constructor(
    private readonly config: {
      url: string;
      apiKey: string;
      maxRetries?: number;
      debugUsage?: boolean;
    },
    private readonly logger: Logger
  ) {
    this.baseUrl = config.url.replace(/\/+$/, '');
    this.httpClient = new RetryableHttpClient(config.maxRetries ?? defaultMaxRetries, logger);
  }

  public async complete(
    abortSignal: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult> {
    const response = await this.httpClient.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.createHeaders(true),
      body: JSON.stringify({
        tools: toolDescriptors,
        model: modelSettings.name,
        stream: false,
        messages: this.sanitizer.sanitize(messages)
      }),
      keepalive: true,
      signal: abortSignal
    });
    const data = await readResponse<OpenaiChatCompletionResponse>(response);
    if (!response.ok) {
      throw new LlmClientError(data.error?.message ?? `AI API returned status ${response.status}`);
    }

    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new LlmClientError('No choices returned from AI API');
    }
    if (this.config.debugUsage) {
      this.logger.log(`Usage: ${JSON.stringify(data.usage)}`);
    }
    return {
      message: choice.message,
      usage: data.usage
    };
  }

  public async getModels(abortSignal: AbortSignal): Promise<LlmModel[]> {
    const response = await this.httpClient.fetch(`${this.baseUrl}/models`, {
      headers: this.createHeaders(false),
      signal: abortSignal
    });
    const data = await readResponse<OpenaiModelsResponse>(response);
    if (!response.ok) {
      throw new LlmClientError(data.error?.message ?? `AI API returned status ${response.status}`);
    }
    if (!Array.isArray(data.data)) {
      throw new LlmClientError('AI API response does not contain a model list');
    }
    return data.data.map(model => {
      if (typeof model.id !== 'string') {
        throw new LlmClientError('AI API returned a model without an ID');
      }
      return { name: model.id, contextWindow: tryReadContextWindow(model) };
    });
  }

  public dispose(): void {}

  private createHeaders(includeContentType: boolean): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      ...(includeContentType ? { 'Content-Type': 'application/json' } : {})
    };
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new LlmClientError(`AI API returned an invalid response with status ${response.status}`);
  }
}

function tryReadContextWindow(model: object): number | undefined {
  for (const name of ['context_window', 'context_length']) {
    const value = name in model ? model[name as keyof typeof model] : undefined;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}
