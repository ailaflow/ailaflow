export class FrontendToolBus {
  private readonly pendingResults: Map<string, (result: string) => void> = new Map();

  public waitForResult(abortSignal: AbortSignal, sessionToken: string, callId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const key = this.getKey(sessionToken, callId);

      abortSignal.addEventListener('abort', () => {
        this.pendingResults.delete(key);
        reject(new Error('Operation aborted'));
      });

      this.pendingResults.set(key, result => {
        this.pendingResults.delete(key);
        resolve(result);
      });
    });
  }

  public sendResult(sessionToken: string, callId: string, result: string): boolean {
    const key = this.getKey(sessionToken, callId);
    const resolve = this.pendingResults.get(key);
    if (!resolve) {
      return false;
    }

    resolve(result);
    return true;
  }

  private getKey(sessionToken: string, callId: string): string {
    return `${sessionToken}:${callId}`;
  }
}
