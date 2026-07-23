export class ChatSessionIdProvider {
  public getAdmin(userName: string): string {
    return `${userName}:admin`;
  }

  public getUserChannel(userName: string, channelName: string): string {
    return `${userName}:channel:${channelName}`;
  }

  public getUserDefaultChannel(userName: string): string {
    return this.getUserChannel(userName, 'default');
  }
}
