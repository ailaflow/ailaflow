export class FrontendToolBus {
  private readonly pendingResults: Map<string, (result: string) => void> = new Map();

  public waitForResult(abortSignal: AbortSignal, sessionId: string, callId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const key = this.getKey(sessionId, callId);

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

  public sendResult(sessionId: string, callId: string, result: string): boolean {
    const key = this.getKey(sessionId, callId);
    const resolve = this.pendingResults.get(key);
    if (!resolve) {
      return false;
    }

    resolve(result);
    return true;
  }

  private getKey(sessionId: string, callId: string): string {
    return `${sessionId}:${callId}`;
  }
}
