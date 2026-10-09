import {
  resolveUserAccessExpressionRequestSchema,
  ResolveUserAccessExpressionResponse,
  UserAccessExpressionParser
} from '@ailaflow/shared';
import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';

export class ResolveUserAccessExpressionEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/user-access-expression';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: UserAccessExpressionUserQuerier) {}

  public async handle(req: Request): Promise<ResolveUserAccessExpressionResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(resolveUserAccessExpressionRequestSchema, req.body);
    const parsedExpression = UserAccessExpressionParser.parse(request.expression);
    return {
      userNames: await this.querier.queryUserNames(signal, parsedExpression)
    };
  }
}
