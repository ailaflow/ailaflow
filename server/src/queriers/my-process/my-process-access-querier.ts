export interface MyProcessAccessQuerier {
  hasAccess(signal: AbortSignal, userName: string, processName: string): Promise<boolean>;
}
