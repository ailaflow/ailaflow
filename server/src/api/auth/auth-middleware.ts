import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { Logger } from '../../core/logger';

export interface AuthenticatedRequest extends Request {
  authToken: AuthToken;
}

export class AuthMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public readonly user: RequestHandler = (req, res, next) => this.handle(false, req, res, next);
  public readonly admin: RequestHandler = (req, res, next) => this.handle(true, req, res, next);

  private async handle(requireAdmin: boolean, req: Request, res: Response, next: NextFunction) {
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

    let authToken: AuthToken | null;
    try {
      const abortSignal = AbortSignal.timeout(2_000);
      authToken = await this.authTokenRepository.tryGetByToken(abortSignal, token);
    } catch (e) {
      res.status(500).json({ error: 'Internal Server Error' });
      this.logger.error(`Failed to retrieve auth token: ${e}`);
      return;
    }

    if (!authToken || authToken.isExpired()) {
      res.status(401).json({ error: 'Auth token is invalid or expired' });
      return;
    }
    if (requireAdmin && !authToken.isAdmin) {
      res.status(403).json({ error: 'Admin privileges are required' });
      return;
    }

    (req as AuthenticatedRequest).authToken = authToken;
    next();
  }
}

export function getAuthToken(req: Request): AuthToken {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.authToken) {
    throw new Error('User is not authenticated');
  }
  return authReq.authToken;
}
