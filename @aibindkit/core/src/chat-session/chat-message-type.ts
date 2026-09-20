export enum ChatMessageType {
  ASSISTANT = 1,
  TOOL = 2,
  USER = 3,
  SYSTEM = 4,
  COMPACT = 5
}

export function strChatMessageType(type: ChatMessageType): string {
  switch (type) {
    case ChatMessageType.ASSISTANT:
      return 'ASSISTANT';
    case ChatMessageType.TOOL:
      return 'TOOL';
    case ChatMessageType.USER:
      return 'USER';
    case ChatMessageType.SYSTEM:
      return 'SYSTEM';
    case ChatMessageType.COMPACT:
      return 'COMPACT';
  }
}
