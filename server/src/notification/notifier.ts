import { UserAccessExpressionParser } from '@ailaflow/shared';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../repositories/notification/notification';
import { NotificationRepository } from '../repositories/notification/notification-repository';
import { ChatSessionId } from '../chat-session/chat-session-id';
import { AdminChatSessionProvider } from '../chat-session/admin-chat-session-provider';
import { ChatSession } from '@aibindkit/llm';
import { ChatSessionInitializerError } from '@aibindkit/express';
import { Logger } from '../core/logger';

export class Notifier {
  private readonly logger = new Logger(Notifier.name);

  public constructor(
    private readonly userAccessExpressionUserQuerier: UserAccessExpressionUserQuerier,
    private readonly userChatSessionProvider: UserChatSessionProvider,
    private readonly adminChatSessionProvider: AdminChatSessionProvider,
    private readonly notificationRepository: NotificationRepository
  ) {}

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

    if (!isTest) {
      const notifications = new Array<Notification>(userNames.length);
      for (let i = 0; i < userNames.length; i++) {
        notifications[i] = Notification.create(userNames[i], processName, message);
      }
      await this.notificationRepository.insertMultiple(signal, notifications);
    }

    const m = this.buildChatMessage(processName, message, null);

    for (const userName of userNames) {
      let session: ChatSession | null = null;
      try {
        session = await this.userChatSessionProvider.get(signal, isTest, userName, channelName);
        session.queueUserMessage(m, {
          internal: true
        });
      } catch (e) {
        if (!ChatSessionInitializerError.is(e)) {
          throw e;
        }
        this.logger.warn(`Failed to initialize chat session for @${userName} user: ${e}`);
      }
    }
  }

  public async notifyUser(
    signal: AbortSignal,
    sessionId: ChatSessionId | null,
    processName: string,
    isTest: boolean,
    userName: string,
    message: string,
    chatDetails: string | null
  ) {
    let session: ChatSession | null | undefined;

    try {
      session = sessionId
        ? await (sessionId.isAdmin()
            ? this.adminChatSessionProvider.tryGet(sessionId.userName)
            : this.userChatSessionProvider.get(signal, sessionId.isTest(), sessionId.userName, sessionId.channelName))
        : null;
    } catch (e) {
      if (!ChatSessionInitializerError.is(e)) {
        throw e;
      }
      this.logger.warn(`Failed to initialize chat session for @${userName} user: ${e}`);
    }

    if (!isTest) {
      const notification = Notification.create(userName, processName, message);
      await this.notificationRepository.insertMultiple(signal, [notification]);
    }

    if (session) {
      const m = this.buildChatMessage(processName, message, chatDetails);
      session.queueUserMessage(m, {
        internal: true
      });
    }
  }

  private buildChatMessage(processName: string, message: string, chatDetails: string | null): string {
    let m = '>>>>>>>>\n';
    m += `The user has a new notification from /${processName} process:\n`;
    m += `Message: ${message}\n`;
    if (chatDetails) {
      m += chatDetails + '\n';
    }
    m += '<<<<<<<<';
    return m;
  }
}
