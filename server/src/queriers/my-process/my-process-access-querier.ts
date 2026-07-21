export interface MyProcessAccessQuerier {
  hasAccess(abortSignal: AbortSignal, userName: string, processName: string): Promise<boolean>;
}
