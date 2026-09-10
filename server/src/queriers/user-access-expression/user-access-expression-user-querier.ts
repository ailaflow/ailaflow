import { UserAccessExpression } from '@ailaflow/model';

export interface UserAccessExpressionUserQuerier {
  queryUserNames(abortSignal: AbortSignal, expression: UserAccessExpression): Promise<string[]>;
}
