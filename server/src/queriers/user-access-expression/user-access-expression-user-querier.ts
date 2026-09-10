import { UserAccessExpression } from '@ailaflow/shared';

export interface UserAccessExpressionUserQuerier {
  queryUserNames(abortSignal: AbortSignal, expression: UserAccessExpression): Promise<string[]>;
}
