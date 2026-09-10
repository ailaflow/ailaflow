import { UserAccessExpression, UserAccessExpressionParser } from '@ailaflow/shared';
import { Repository } from '../repository';

export class ResourceAccess {
  public static createFromAccessExpression(resourceId: string, expression: string): ResourceAccess {
    const e = UserAccessExpressionParser.parse(expression);
    return new ResourceAccess(resourceId, e);
  }

  public constructor(
    public readonly resourceId: string,
    public readonly expression: UserAccessExpression
  ) {}
}

export interface ResourceAccessRepository extends Repository {
  replace(abortSignal: AbortSignal, resourceAccess: ResourceAccess): Promise<void>;
}
