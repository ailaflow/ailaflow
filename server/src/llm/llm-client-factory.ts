import { AnthropicLlmClient, CodexLlmClient, LlmClient, LlmModelSettings, OpenaiLlmClient } from '@aibindkit/llm';
import { ResolvedLlmUseCaseConfiguration } from '../repositories/configuration/llm/llm-configuration';
import { LlmProviderConfiguration } from '../repositories/configuration/llm/llm-provider-configuration';
import { LlmProviderType } from '@ailaflow/shared';
import { Logger } from '../core/logger';

const DEBUG_USAGE = Boolean(process.env.DEBUG_USAGE);

export interface ConfiguredLlmClient {
  client: LlmClient;
  modelSettings: LlmModelSettings;
}

export class LlmClientFactory {
  public create(configuration: ResolvedLlmUseCaseConfiguration): ConfiguredLlmClient {
    return {
      client: this.createForProvider(configuration.provider),
      modelSettings: {
        name: configuration.modelName,
        contextWindow: configuration.modelContextWindow,
        effectiveContextWindowPercent: configuration.effectiveContextWindowPercent
      }
    };
  }

  public createForProvider(provider: LlmProviderConfiguration): LlmClient {
    switch (provider.type) {
      case LlmProviderType.OPENAI:
        return new OpenaiLlmClient(
          { url: 'https://api.openai.com/v1', apiKey: provider.apiKey!, debugUsage: DEBUG_USAGE },
          new Logger(OpenaiLlmClient.name)
        );
      case LlmProviderType.ANTHROPIC:
        return new AnthropicLlmClient({ apiKey: provider.apiKey! });
      case LlmProviderType.OPENAI_COMPATIBLE:
        return new OpenaiLlmClient(
          { url: provider.url!, apiKey: provider.apiKey!, debugUsage: DEBUG_USAGE },
          new Logger(OpenaiLlmClient.name)
        );
      case LlmProviderType.CODEX_APP_SERVER:
        return new CodexLlmClient({ url: provider.url! });
    }
  }
}
