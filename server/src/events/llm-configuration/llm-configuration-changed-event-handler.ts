import { ChatSessionManager } from '@aibindkit/express';
import { LlmClientProvider } from '../../llm/llm-client-provider';
import { EventHandler } from '../event-handler';
import { LlmConfigurationChangedEvent } from './llm-configuration-changed-event';

export class LlmConfigurationChangedEventHandler implements EventHandler<LlmConfigurationChangedEvent> {
  public readonly name = LlmConfigurationChangedEvent.name;

  public constructor(
    private readonly llmClientProvider: LlmClientProvider,
    private readonly chatSessionManager: ChatSessionManager
  ) {}

  public async handle() {
    this.llmClientProvider.flushAll();
    this.chatSessionManager.flushAll();
  }
}
