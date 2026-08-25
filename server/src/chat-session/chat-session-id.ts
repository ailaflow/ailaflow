export type ChatSessionType = 'admin' | 'user' | 'test';

export class ChatSessionId {
  public static createAdmin(userName: string): ChatSessionId {
    return new ChatSessionId('admin', userName, 'default');
  }

  public static createUserChannel(userName: string, isTest: boolean, channelName: string): ChatSessionId {
    const type = isTest ? 'test' : 'user';
    return new ChatSessionId(type, userName, channelName);
  }

  public static decode(sessionId: string): ChatSessionId {
    const parts = sessionId.split(':', 3);
    return new ChatSessionId(parts[1] as ChatSessionType, parts[0], parts[2]);
  }

  public constructor(
    private readonly type: ChatSessionType,
    public readonly userName: string,
    public readonly channelName: string
  ) {}

  public encode(): string {
    return `${this.userName}:${this.type}:${this.channelName}`;
  }

  public isTest(): boolean {
    return this.type === 'test';
  }
}
