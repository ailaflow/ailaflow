import { UserAccessExpressionParser } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../../repositories/notification/notification';
import { NotificationRepository } from '../../repositories/notification/notification-repository';

export class Notifier {
  public constructor(
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly notificationRepository: NotificationRepository
  ) {}

  public async notify(abortSignal: AbortSignal, isTest: boolean, userExpression: string, notification: string) {
    const expression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, expression);
    const notifications = userNames.map(userName => Notification.create(userName, notification));

    const channelName = this.userChatSessionProvider.getDefaultChannelName();

    await this.notificationRepository.insertMultiple(abortSignal, notifications);

    for (const n of notifications) {
      const session = await this.userChatSessionProvider.get(abortSignal, isTest, n.userName, channelName);
      if (session) {
        session.queueUserMessage(`>>>>>>>>\nThe user has a new notification: "${n.message}"\n<<<<<<<<`, {
          internal: true
        });
      }
    }
  }
}
