import { AgentStep, LlmUseCase } from '@ailaflow/shared';
import { ChatSessionFactory, ChatSessionUpdate, DisabledChatSessionStorage, ToolSet } from '@aibindkit/llm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LlmClientProvider } from '../../llm/llm-client-provider';
import { ServerPaths } from '../../core/server-paths';
import { AgentToolSetProviderFactory } from '../../chat-session/agent-tool-set-provider-factory';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';
import { Logger } from '../../core/logger';
import { LlmMessageContentExtractor } from '@aibindkit/core';

const AGENT_TIMEOUT_MS = 10 * 60_000;

export class AgentSessionRunner {
  private readonly systemPrompt: string;
  private readonly sessionFactory = new ChatSessionFactory(new Logger('AiBindKit'), new DisabledChatSessionStorage());

  public constructor(
    private readonly llmClientProvider: LlmClientProvider,
    private readonly toolSetProviderFactory: AgentToolSetProviderFactory,
    serverPaths: ServerPaths
  ) {
    this.systemPrompt = readFileSync(join(serverPaths.getRuntimeFolderPath(), 'assets', 'agent-prompt.md'), 'utf-8');
  }

  public async run(signal: AbortSignal, step: AgentStep, state: ProcessExecutionGlobalState): Promise<void> {
    const prompt = state.variableEvaluator.evaluateStringOrVariable(step.properties.prompt);

    const executionSignal = AbortSignal.any([signal, AbortSignal.timeout(AGENT_TIMEOUT_MS)]);
    const logger = state.logger;

    const tools = await this.toolSetProviderFactory.create(
      executionSignal,
      step.properties.allowedProcessNames,
      step.properties.allowedVariableNames,
      step.properties.sandboxName,
      step.properties.isTerminalAllowed,
      state.process,
      state.context,
      state.executionId
    );
    const llm = await this.llmClientProvider.get(executionSignal, LlmUseCase.AGENT_STEP);

    const toolSet = new ToolSet();
    for (const tool of tools.tools) {
      toolSet.addTool(tool);
    }

    const session = this.sessionFactory.create(randomUUID(), tools.hash, llm.client, llm.modelSettings, toolSet);
    session.setSystemMessage(this.systemPrompt);

    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(executionSignal.reason);
        const onFailed = (event: ChatSessionUpdate) => reject(new Error(event.update.failReason ?? 'Agent session interrupted'));
        const onCompleted = (event: ChatSessionUpdate) => {
          for (const { message } of event.update.completedMessages ?? []) {
            if (message.role === 'assistant') {
              const content = LlmMessageContentExtractor.tryExtract(message);
              if (content) {
                if (content.reasoning) {
                  logger.agentResponse(content.reasoning);
                }
                if (content.content) {
                  logger.agentResponse(content.content);
                }
              }
              for (const call of message.tool_calls ?? []) {
                if (call.type === 'function') {
                  logger.agentToolCall(call.id, call.function.name, call.function.arguments);
                }
              }
            } else if (message.role === 'tool' && typeof message.content === 'string') {
              logger.agentToolResponse(message.tool_call_id, message.content);
            }
          }
          if (event.isWorking === false) {
            resolve();
          }
        };

        session.onMessageCompleted.subscribe(onCompleted);
        session.onMessageFailed.subscribe(onFailed);
        executionSignal.addEventListener('abort', onAbort, { once: true });

        session.onDestroyed.subscribe(() => {
          session.onMessageCompleted.unsubscribe(onCompleted);
          session.onMessageFailed.unsubscribe(onFailed);
          executionSignal.removeEventListener('abort', onAbort);
        });

        session.queueUserMessage(prompt);
      });
    } finally {
      session.destroy();
    }
  }
}
