import { HttpRequest, HttpRequestError } from './http-server';

export class TokenMiddleware {
  public constructor(private readonly token: string) {}

  public assert(req: HttpRequest<unknown>) {
    const token = req.headers['x-token'];
    if (token && typeof token === 'string' && token === this.token) {
      return;
    }
    throw new HttpRequestError(401, 'Invalid bridge token');
  }
}
