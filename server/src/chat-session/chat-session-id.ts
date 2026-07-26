export class ChatSessionId {
  public static createAdmin(userName: string): ChatSessionId {
    return new ChatSessionId(userName, 'admin');
  }

  public static createUserChannel(userName: string, channelName: string): ChatSessionId {
    return new ChatSessionId(userName, `channel:${channelName}`);
  }

  public static createUserMainChannel(userName: string): ChatSessionId {
    return new ChatSessionId(userName, 'channel:main');
  }

  public static decode(sessionId: string): ChatSessionId {
    const parts = sessionId.split(':', 2);
    return new ChatSessionId(parts[0], parts[1]);
  }

  public constructor(
    public readonly userName: string,
    public readonly v: string
  ) {}

  public encode(): string {
    return `${this.userName}:${this.v}`;
  }
}
