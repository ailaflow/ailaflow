import { UserAccessExpressionParser } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../repositories/notification/notification';
import { NotificationRepository } from '../repositories/notification/notification-repository';
import { ChatSessionId } from '../chat-session/chat-session-id';
import { AdminChatSessionProvider } from '../chat-session/admin-chat-session-provider';

export class Notifier {
  public constructor(
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly adminChatSessionProvider: AdminChatSessionProvider,
    private readonly notificationRepository: NotificationRepository
  ) {}

  public getDefaultUserChannelName(): string {
    return this.userChatSessionProvider.getDefaultChannelName();
  }

  public async notifyUsersMatchingAccessExpression(
    signal: AbortSignal,
    processName: string,
    isTest: boolean,
    userExpression: string,
    channelName: string,
    message: string
  ) {
    const expression = UserAccessExpressionParser.parse(userExpression);
    const userNames = await this.userAccessExpressionUserQuerier.queryUserNames(signal, expression);
    return this.notifyUsers(signal, processName, isTest, userNames, channelName, message);
  }

  public async notifyUsers(
    signal: AbortSignal,
    processName: string,
    isTest: boolean,
    userNames: string[],
    channelName: string,
    message: string
  ) {
    if (!isTest) {
      const notifications = new Array<Notification>(userNames.length);
      for (let i = 0; i < userNames.length; i++) {
        notifications[i] = Notification.create(userNames[i], processName, message);
      }
      await this.notificationRepository.insertMultiple(signal, notifications);
    }

    const m = this.buildChatMessage(processName, message);

    for (const userName of userNames) {
      const session = await this.userChatSessionProvider.get(signal, isTest, userName, channelName);
      if (session) {
        session.queueUserMessage(m, {
          internal: true
        });
      }
    }
  }

  public async notifyUser(
    signal: AbortSignal,
    sessionId: ChatSessionId | null,
    processName: string,
    isTest: boolean,
    userName: string,
    message: string
  ) {
    const chatSession = sessionId
      ? await (sessionId.isAdmin()
          ? this.adminChatSessionProvider.tryGet(sessionId.userName)
          : this.userChatSessionProvider.get(signal, sessionId.isTest(), sessionId.userName, sessionId.channelName))
      : null;

    if (!isTest) {
      const notification = Notification.create(userName, processName, message);
      await this.notificationRepository.insertMultiple(signal, [notification]);
    }

    if (chatSession) {
      const m = this.buildChatMessage(processName, message);
      chatSession.queueUserMessage(m, {
        internal: true
      });
    }
  }

  private buildChatMessage(processName: string, message: string): string {
    let m = '>>>>>>>>\n';
    m += `The user has a new notification from /${processName} process:\n`;
    m += `Message: ${message}\n`;
    m += '<<<<<<<<';
    return m;
  }
}
