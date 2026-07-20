import { ResourceValidator } from '../resource';
import { UserAccessExpressionParser, UserAccessExpressionParserError } from '../user-access/user-access-expression-parser';

export class ProcessValidator {
  public static readonly validateName = ResourceValidator.validateName;
  public static readonly validateDescription = ResourceValidator.validateDescription;

  public static validateUserAccessExpression(expression: string): string | null {
    try {
      UserAccessExpressionParser.parse(expression);
    } catch (e) {
      if (e instanceof UserAccessExpressionParserError) {
        return e.message;
      }
      throw e;
    }
    return null;
  }
}
