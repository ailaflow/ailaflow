export enum MessageType {
  AI = 1,
  TOOL = 2,
  USER = 3,
  SYSTEM = 4
}

export function strMessageType(type: MessageType): string {
  switch (type) {
    case MessageType.AI:
      return 'AI';
    case MessageType.TOOL:
      return 'TOOL';
    case MessageType.USER:
      return 'USER';
    case MessageType.SYSTEM:
      return 'SYSTEM';
  }
}
