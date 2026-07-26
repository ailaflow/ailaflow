export enum ChatMessageType {
  AI = 1,
  TOOL = 2,
  USER = 3,
  SYSTEM = 4
}

export function strChatMessageType(type: ChatMessageType): string {
  switch (type) {
    case ChatMessageType.AI:
      return 'AI';
    case ChatMessageType.TOOL:
      return 'TOOL';
    case ChatMessageType.USER:
      return 'USER';
    case ChatMessageType.SYSTEM:
      return 'SYSTEM';
  }
}
