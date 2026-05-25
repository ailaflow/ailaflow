import { LlmClient } from '../../llm-client/llm-client';
import { ToolSet } from '../tools/tool-set';
import { ToolCall } from '../../llm-client/types/tool-call';
import { AiMessage } from './ai-message';
import { SystemMessage } from './system-message';
import { ToolMessage } from './tool-message';
import { UserMessage } from './user-message';

export class MessageFactory {
  public constructor(
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public createSystem(content: string): SystemMessage {
    return new SystemMessage(content);
  }

  public createUser(content: string): UserMessage {
    return new UserMessage(content);
  }

  public createAi(): AiMessage {
    return new AiMessage(this.llmClient, this.toolSet);
  }

  public createTool(calls: ToolCall[]): ToolMessage {
    return new ToolMessage(calls, this.toolSet);
  }
}
