import type { ToolCall } from '@aibindkit/core';
import { LlmClient } from '../../client/llm-client';
import { ToolSet } from '../tools/tool-set';
import { AiMessage } from './ai-message';
import { SystemMessage } from './system-message';
import { ToolMessage } from './tool-message';
import { UserMessage } from './user-message';

export class MessageFactory {
  public constructor(
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public createSystem(id: number, content: string): SystemMessage {
    return new SystemMessage(id, content);
  }

  public createUser(id: number, content: string): UserMessage {
    return new UserMessage(id, content);
  }

  public createAi(id: number): AiMessage {
    return new AiMessage(id, this.llmClient, this.toolSet);
  }

  public createTool(id: number, calls: ToolCall[], sessionId: string): ToolMessage {
    return new ToolMessage(id, calls, sessionId, this.toolSet);
  }
}
