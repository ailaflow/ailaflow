import { ResourceValidator } from '../resource';
import { UserAccessExpressionParser } from '../user-access/user-access-expression-parser';

export class ProcessValidator {
  public static readonly validateName = ResourceValidator.validateName;
  public static readonly validateDescription = ResourceValidator.validateDescription;

  public static validateUserAccessExpression(expression: string): string | null {
    return UserAccessExpressionParser.validate(expression);
  }
}
