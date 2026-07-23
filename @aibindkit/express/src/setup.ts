import type { Express, RequestHandler } from 'express';
import { ChatSessionFactory, FrontendToolBus, FrontendToolFactory } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';
import { ChatSessionActivator } from './chat-session-activator';
import { Endpoint } from './endpoints/endpoint';
import { RestoreChatEndpoint } from './endpoints/restore-chat-endpoint';
import { SendChatMessageEndpoint } from './endpoints/send-chat-message-endpoint';
import { SendFrontendToolResultEndpoint } from './endpoints/send-frontend-tool-result-endpoint';
import { InterruptChatEndpoint } from './endpoints/interrupt-chat-endpoint';
import { RestartChatEndpoint } from './endpoints/restart-chat-endpoint';
import { ChatSessionStore } from './chat-session-store';
import { DefaultChatSessionStore } from './default-chat-session-store';

export interface AiBindKitServerConfiguration {
  sessionResolver: ChatSessionResolver;
  sessionStore?: ChatSessionStore;
  middleware?: RequestHandler;
}

export function setupServer(app: Express, config: AiBindKitServerConfiguration) {
  const frontendToolBus = new FrontendToolBus();
  const frontendToolFactory = new FrontendToolFactory(frontendToolBus);
  const chatSessionFactory = new ChatSessionFactory();
  const chatSessionStore = config.sessionStore ?? new DefaultChatSessionStore();
  const chatSessionActivator = new ChatSessionActivator(chatSessionStore, config.sessionResolver, chatSessionFactory, frontendToolFactory);

  const endpoints: Endpoint[] = [
    new RestoreChatEndpoint(chatSessionActivator),
    new SendChatMessageEndpoint(chatSessionStore),
    new SendFrontendToolResultEndpoint(frontendToolBus),
    new InterruptChatEndpoint(chatSessionStore),
    new RestartChatEndpoint(chatSessionStore)
  ];

  for (const endpoint of endpoints) {
    const handler: RequestHandler = async (req, res) => {
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
    };

    if (config.middleware) {
      app[endpoint.method](endpoint.path, config.middleware, handler);
    } else {
      app[endpoint.method](endpoint.path, handler);
    }
  }
}
