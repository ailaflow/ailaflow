import { Request } from 'express';

export interface ChatAuthContextResolver {
  resolve(httpRequest: Request): ChatAuthContext;
}

export type ChatAuthContext = Record<string, unknown>;

export class DefaultChatAuthContextResolver implements ChatAuthContextResolver {
  public resolve(): ChatAuthContext {
    return {};
  }
}
