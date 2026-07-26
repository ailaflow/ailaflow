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

  public static parse(sessionId: string): ChatSessionId {
    const parts = sessionId.split(':');
    return new ChatSessionId(parts[0], parts[0]);
  }

  public constructor(
    public readonly userName: string,
    public readonly v: string
  ) {}

  public serialize(): string {
    return `${this.userName}:${this.v}`;
  }
}
