import type { Express, RequestHandler } from 'express';
import { ChatSessionFactory, ChatSessionStorage, DisabledChatSessionStorage, FrontendToolBus, FrontendToolFactory } from '@aibindkit/llm';
import type { ChatSessionResolver } from './chat-session-resolver';
import { ChatSessionActivator } from './chat-session-activator';
import { Endpoint } from './endpoints/endpoint';
import { RestoreChatEndpoint } from './endpoints/restore-chat-endpoint';
import { SendChatMessageEndpoint } from './endpoints/send-chat-message-endpoint';
import { SendFrontendToolResultEndpoint } from './endpoints/send-frontend-tool-result-endpoint';
import { InterruptChatEndpoint } from './endpoints/interrupt-chat-endpoint';
import { RestartChatEndpoint } from './endpoints/restart-chat-endpoint';
import { LiveChatSessionStore } from './live-chat-session-store';
import { ChatAuthContextResolver, DefaultChatAuthContextResolver } from './chat-auth-context-resolver';
import { ChatSessionManager } from './chat-session-manager';

export interface ChatServerConfiguration {
  sessionResolver: ChatSessionResolver;
  authContextResolver?: ChatAuthContextResolver;
  /**
   * An optional session storage for persisting chat sessions across server restarts.
   */
  sessionStorage?: ChatSessionStorage;
  sessionManager?: ChatSessionManager;
  middleware?: RequestHandler;
}

export function setupServer(app: Express, config: ChatServerConfiguration): void {
  const frontendToolBus = new FrontendToolBus();
  const frontendToolFactory = new FrontendToolFactory(frontendToolBus);
  const authContextResolver = config.authContextResolver ?? new DefaultChatAuthContextResolver();
  const sessionStorage = config.sessionStorage ?? new DisabledChatSessionStorage();
  const sessionFactory = new ChatSessionFactory(sessionStorage);
  const liveChatSessionStore = new LiveChatSessionStore();
  const chatSessionActivator = new ChatSessionActivator(
    liveChatSessionStore,
    config.sessionResolver,
    sessionStorage,
    sessionFactory,
    frontendToolFactory
  );

  const endpoints: Endpoint[] = [
    new RestoreChatEndpoint(authContextResolver, chatSessionActivator),
    new SendChatMessageEndpoint(liveChatSessionStore),
    new SendFrontendToolResultEndpoint(frontendToolBus),
    new InterruptChatEndpoint(liveChatSessionStore),
    new RestartChatEndpoint(liveChatSessionStore)
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

  if (config.sessionManager) {
    config.sessionManager.initialize({
      chatSessionActivator,
      liveChatSessionStore
    });
  }
}
