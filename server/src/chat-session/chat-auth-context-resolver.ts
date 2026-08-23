import { ChatAuthContextResolver as BaseChatAuthContextResolver, ChatAuthContext } from '@aibindkit/express';
import { Request } from 'express';
import { getAuthToken } from '../api/auth/auth-middleware';

export class ChatAuthContextResolver implements BaseChatAuthContextResolver {
  public resolve(httpRequest: Request): ChatAuthContext {
    const authToken = getAuthToken(httpRequest);
    return {
      userName: authToken.userName,
      isAdmin: authToken.isAdmin
    };
  }
}
