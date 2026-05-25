import { Logger } from './core/logger';
import { SandboxPaths } from './sandbox/sandbox-paths';
import express from 'express';
import { SandboxManager } from './managers/sandbox-manager';
import { SandboxExecutorManager } from './managers/sandbox-executor-manager';
import { ChatSession } from './chat-session/chat-session';
import { MessageFactory } from './chat-session/messages/message-factory';
import { ToolSet } from './chat-session/tools/tool-set';
import { CurrentTimeTool } from './chat-session/tools/current-time-tool';
import { OpenaiLlmClient } from './llm-client/openai-llm-client';

const PORT = process.env.PORT || 3000;

const logger = new Logger('Server');

export class Server {
  public static async create(abortSignal: AbortSignal): Promise<Server> {
    const sandboxPaths = new SandboxPaths();
    const sandboxManager = new SandboxManager(sandboxPaths);
    const sandboxExecutorManager = new SandboxExecutorManager(sandboxManager);

    const instanceId = 'instance_1';

    /*const scriptExecutor = await sandboxExecutorManager.get(abortSignal, instanceId);

    for (let i = 0; i < 5; i++) {
      const bashAbortSignal = AbortSignal.timeout(10_000);
      const json = await scriptExecutor.executeJSON(bashAbortSignal, {
        folderPath: 'test',
        scriptName: 'test.mjs',
        input: {
          testsInput: 'test'
        }
      });
      console.log('Execution result:', json);
    }*/

    const llmClient = new OpenaiLlmClient();
    const toolSet = new ToolSet();
    toolSet.addTool(new CurrentTimeTool());
    const messageFactory = new MessageFactory(llmClient, toolSet);

    const session = new ChatSession(messageFactory);
    session.pushSystemMessage('You are a helpful assistant.');
    session.queueUserMessage('What is current time?');
    //session.queueUserMessage('Where is poland?');

    const app = express();
    app.listen(PORT, () => {
      logger.log(`Server is running on port ${PORT}`);
    });

    return new Server(sandboxManager);
  }

  public constructor(private readonly sandboxManager: SandboxManager) {}

  public close() {
    this.sandboxManager.stop();
  }
}
