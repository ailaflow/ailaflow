import { UserAccessExpression } from '@ailaflow/shared';

export interface UserAccessExpressionUserQuerier {
  queryUserNames(signal: AbortSignal, expression: UserAccessExpression): Promise<string[]>;
}
