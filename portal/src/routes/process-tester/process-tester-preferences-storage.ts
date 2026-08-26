export class ProcessTesterPreferencesStorage {
  private readonly chatUserNamesStorageKey = '__processTesterChatUserNames';

  public readChatUserNames(): string[] {
    const value = window.localStorage[this.chatUserNamesStorageKey];
    return value ? JSON.parse(value) : [];
  }

  public saveChatUserNames(chatUserNames: string[]): void {
    window.localStorage[this.chatUserNamesStorageKey] = JSON.stringify(chatUserNames);
  }
}
