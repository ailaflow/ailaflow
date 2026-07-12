import type { Express, Request, Response } from 'express';
import { ChatSessionFactory, FrontendToolBus, FrontendToolFactory } from '@aibindkit/llm';
import type { ChatSessionSessionResolver } from './chat-session-resolver';
import { ChatSessionProvider } from './chat-session-provider';
import { Endpoint } from './endpoints/endpoint';
import { RestoreChatEndpoint } from './endpoints/restore-chat-endpoint';
import { SendChatMessageEndpoint } from './endpoints/send-chat-message-endpoint';
import { SendFrontendToolResultEndpoint } from './endpoints/send-frontend-tool-result-endpoint';
import { InterruptChatEndpoint } from './endpoints/interrupt-chat-endpoint';

export function setupServer(app: Express, sessionResolver: ChatSessionSessionResolver) {
  const frontendToolBus = new FrontendToolBus();
  const frontendToolFactory = new FrontendToolFactory(frontendToolBus);
  const chatSessionFactory = new ChatSessionFactory();
  const chatSessionProvider = new ChatSessionProvider(sessionResolver, chatSessionFactory, frontendToolFactory);

  const endpoints: Endpoint[] = [
    new RestoreChatEndpoint(chatSessionProvider),
    new SendChatMessageEndpoint(chatSessionProvider),
    new SendFrontendToolResultEndpoint(frontendToolBus),
    new InterruptChatEndpoint(chatSessionProvider)
  ];

  for (const endpoint of endpoints) {
    app[endpoint.method](endpoint.path, async (req: Request, res: Response) => {
      try {
        const jsonOrVoid = await endpoint.handle(req, res);
        if (jsonOrVoid) {
          res.json(jsonOrVoid).end();
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(`Error occurred while handling ${endpoint.path}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  }
}
