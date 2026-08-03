import { UserAccessExpressionParser } from '@aila/model';
import { UserChatSessionProvider } from '../../providers/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';

export class Notifier {
  public constructor(
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider
  ) {}

  public async notify(abortSignal: AbortSignal, userExpression: string, notification: string) {
    const expression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, expression);

    for (const userName of userNames) {
      const session = this.userChatSessionProvider.tryGetMainChannel(userName);
      if (session) {
        session.queueUserMessage(`>>>>>>>>\nThe user has a new notification: "${notification}"\n<<<<<<<<`, {
          internal: true
        });
      }
    }
  }
}
