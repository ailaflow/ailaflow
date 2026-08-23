export class ChatSessionId {
  public static createAdmin(userName: string): ChatSessionId {
    return new ChatSessionId(userName, 'admin', null);
  }

  public static createUserChannel(userName: string, channelName: string): ChatSessionId {
    return new ChatSessionId(userName, 'channel', channelName);
  }

  public static decode(sessionId: string): ChatSessionId {
    const parts = sessionId.split(':', 3);
    return new ChatSessionId(parts[0], parts[1], parts[2] || null);
  }

  public constructor(
    public readonly userName: string,
    private readonly kind: string,
    private readonly channelName: string | null
  ) {}

  public encode(): string {
    let id = `${this.userName}:${this.kind}`;
    if (this.channelName) {
      id += `:${this.channelName}`;
    }
    return id;
  }

  public getChannelName(): string {
    if (this.kind === 'channel' && this.channelName) {
      return this.channelName;
    }
    throw new Error('This session is not a user channel');
  }
}
