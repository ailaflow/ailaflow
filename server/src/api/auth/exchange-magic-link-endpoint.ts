import { exchangeMagicLinkRequestSchema, ExchangeMagicLinkResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { MagicLinkExchanger } from '../../magic-link/magic-link-exchanger';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class ExchangeMagicLinkEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/auth/magic-link/exchange';

  public constructor(private readonly magicLinkExchanger: MagicLinkExchanger) {}

  public async handle(req: Request): Promise<ExchangeMagicLinkResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(exchangeMagicLinkRequestSchema, req.body);
    const authToken = await this.magicLinkExchanger.exchange(signal, request.token);
    if (!authToken) {
      throw new EndpointError('Magic link is invalid or expired', 401);
    }

    return {
      userName: authToken.userName,
      authToken: authToken.token,
      isAdmin: authToken.isAdmin
    };
  }
}
