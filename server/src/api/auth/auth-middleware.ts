import { Request, Response } from 'express';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token-repository/auth-token-repository';

export interface AuthenticatedRequest extends Request {
  authToken: AuthToken;
}

export class AuthMiddleware {
  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public wrap(admin: boolean, handler: (req: Request, res: Response) => Promise<void>) {
    return async (req: Request, res: Response) => {
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        res.status(401).json({ error: 'Authorization header is missing' });
        return;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        res.status(401).json({ error: 'Auth token is missing' });
        return;
      }

      const authToken = await this.authTokenRepository.tryGetByToken(token);
      if (!authToken || authToken.isExpired()) {
        res.status(401).json({ error: 'Auth token is invalid or expired' });
        return;
      }

      if (admin && !authToken.isAdmin) {
        res.status(403).json({ error: 'Admin privileges are required' });
        return;
      }

      (req as AuthenticatedRequest).authToken = authToken;
      return handler(req, res);
    };
  }
}

export function getAuthToken(req: Request): AuthToken {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authToken) {
    throw new Error('User is not authenticated');
  }
  return authReq.authToken;
}
