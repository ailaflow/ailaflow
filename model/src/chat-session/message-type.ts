export enum MessageType {
  AI,
  TOOL,
  USER,
  SYSTEM
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
