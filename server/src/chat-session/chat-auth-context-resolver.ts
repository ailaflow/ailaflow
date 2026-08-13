import { ChatAuthContextResolver as BaseChatAuthContextResolver, ChatAuthContext } from '@aibindkit/express';
import { Request } from 'express';
import { getAuthToken } from '../api/auth/auth-middleware';

export class ChatAuthContextResolver implements BaseChatAuthContextResolver {
  public resolve(httpRequest: Request): ChatAuthContext {
    return {
      userName: getAuthToken(httpRequest).userName
    };
  }
}
