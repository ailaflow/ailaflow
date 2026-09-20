import { ChatMessageType } from '@aibindkit/core';
import { Message } from './message';
import { UserMessage } from './user-message';

export enum UserMessageAction {
  COMPACT = 1
}

export class UserMessageActionParser {
  public static tryParse(message: Message): UserMessageAction | null {
    if (message.type === ChatMessageType.USER) {
      const um = message as UserMessage;
      if (/^\s*\/compact\s*$/.test(um.text)) {
        return UserMessageAction.COMPACT;
      }
    }
    return null;
  }
}
