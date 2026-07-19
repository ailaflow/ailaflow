import { Request, Response } from 'express';
import { AuthToken, AuthTokenRepository } from '../../repositories/auth-token-repository/auth-token-repository';

export interface AuthenticatedRequest extends Request {
  authToken: AuthToken;
}

export class AuthMiddleware {
  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public async handle(admin: boolean, req: Request, res: Response): Promise<boolean> {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing' });
      return true;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Auth token is missing' });
      return true;
    }

    const abortSignal = AbortSignal.timeout(2_000);
    const authToken = await this.authTokenRepository.tryGetByToken(abortSignal, token);
    if (!authToken || authToken.isExpired()) {
      res.status(401).json({ error: 'Auth token is invalid or expired' });
      return true;
    }

    if (admin && !authToken.isAdmin) {
      res.status(403).json({ error: 'Admin privileges are required' });
      return true;
    }

    (req as AuthenticatedRequest).authToken = authToken;
    return false;
  }
}

export function getAuthToken(req: Request): AuthToken {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authToken) {
    throw new Error('User is not authenticated');
  }
  return authReq.authToken;
}
