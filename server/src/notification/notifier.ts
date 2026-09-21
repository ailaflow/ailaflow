import { UserAccessExpressionParser } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../repositories/notification/notification';
import { NotificationRepository } from '../repositories/notification/notification-repository';

export class Notifier {
  public constructor(
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly notificationRepository: NotificationRepository
  ) {}

  public async notify(abortSignal: AbortSignal, processName: string, isTest: boolean, userExpression: string, message: string) {
    const expression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(abortSignal, expression);

    const notifications = new Array<Notification>(userNames.length);
    for (let i = 0; i < userNames.length; i++) {
      notifications[i] = Notification.create(processName, userNames[i], message);
    }

    const channelName = this.userChatSessionProvider.getDefaultChannelName();

    await this.notificationRepository.insertMultiple(abortSignal, notifications);

    let m = '>>>>>>>>\n';
    m += `The user has a new notification from /${processName} process:\n`;
    m += `Message: ${message}\n`;
    m += '<<<<<<<<';

    for (const n of notifications) {
      const session = await this.userChatSessionProvider.get(abortSignal, isTest, n.userName, channelName);
      if (session) {
        session.queueUserMessage(m, {
          internal: true
        });
      }
    }
  }
}
