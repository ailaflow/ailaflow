import { AgentStep, LlmUseCase } from '@aila/model';
import { ChatSessionFactory, ChatSessionUpdate, DisabledChatSessionStorage, ToolSet } from '@aibindkit/llm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LlmClientProvider } from '../../llm/llm-client-provider';
import { ServerPaths } from '../../core/server-paths';
import { AgentToolSetProviderFactory } from '../../chat-session/agent-tool-set-provider-factory';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

const AGENT_TIMEOUT_MS = 10 * 60_000;

export class AgentSessionRunner {
  private readonly systemPrompt: string;
  private readonly sessionFactory = new ChatSessionFactory(new DisabledChatSessionStorage());

  public constructor(
    private readonly llmClientProvider: LlmClientProvider,
    private readonly toolSetProviderFactory: AgentToolSetProviderFactory,
    serverPaths: ServerPaths
  ) {
    this.systemPrompt = readFileSync(join(serverPaths.getRuntimeFolderPath(), 'assets', 'agent-prompt.md'), 'utf-8');
  }

  public async run(abortSignal: AbortSignal, step: AgentStep, state: ProcessExecutionGlobalState): Promise<void> {
    const prompt = state.variableEvaluator.evaluateStringOrVariable(step.properties.prompt);

    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(AGENT_TIMEOUT_MS)]);
    const logger = state.logger;

    const tools = await this.toolSetProviderFactory.create(
      signal,
      step.properties.allowedProcesses,
      step.properties.allowedVariableNames,
      step.properties.sandboxName,
      step.properties.isTerminalAllowed,
      state.process,
      state.context,
      state.executionId
    );
    const llm = await this.llmClientProvider.get(signal, LlmUseCase.AGENT_STEP);

    const toolSet = new ToolSet();
    for (const tool of tools.tools) {
      toolSet.addTool(tool);
    }

    const session = this.sessionFactory.create(randomUUID(), tools.hash, llm.client, llm.modelSettings, toolSet);
    session.setSystemMessage(this.systemPrompt);

    try {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        const onFailed = (event: ChatSessionUpdate) => reject(new Error(event.update.failReason ?? 'Agent session interrupted'));
        const onCompleted = (event: ChatSessionUpdate) => {
          for (const { message } of event.update.completedMessages ?? []) {
            if (message.role === 'assistant') {
              if (typeof message.content === 'string' && message.content.trim()) {
                logger.info(`Agent: ${trim(message.content, 2_000)}`);
              }
              for (const call of message.tool_calls ?? []) {
                if (call.type === 'function') {
                  logger.info(`Agent tool: ${call.function.name}`);
                }
              }
            } else if (message.role === 'tool' && typeof message.content === 'string') {
              logger.info(`Agent tool response: ${trim(message.content, 128)}`);
            }
          }
          if (event.isWorking === false) {
            resolve();
          }
        };

        session.onMessageCompleted.subscribe(onCompleted);
        session.onMessageFailed.subscribe(onFailed);
        signal.addEventListener('abort', onAbort, { once: true });

        session.onDestroyed.subscribe(() => {
          session.onMessageCompleted.unsubscribe(onCompleted);
          session.onMessageFailed.unsubscribe(onFailed);
          signal.removeEventListener('abort', onAbort);
        });

        session.queueUserMessage(prompt);
      });
    } finally {
      session.destroy();
    }
    logger.info(`Agent "${step.name}" finished`);
  }
}

function trim(value: string, maxLength: number): string {
  if (value.length > maxLength) {
    return `${value.slice(0, maxLength)}...`;
  }
  return value;
}
