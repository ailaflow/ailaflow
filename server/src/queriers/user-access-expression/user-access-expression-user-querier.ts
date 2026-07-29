import { UserAccessExpression } from '@aila/model';

export interface UserAccessExpressionUserQuerier {
  queryUserNames(abortSignal: AbortSignal, expression: UserAccessExpression): Promise<string[]>;
}
