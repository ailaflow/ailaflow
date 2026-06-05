export class FrontendToolBus {
  private readonly pendingResults: Map<string, (result: string) => void> = new Map();

  public waitForResult(abortSignal: AbortSignal, callId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (abortSignal.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      abortSignal.addEventListener('abort', () => {
        this.pendingResults.delete(callId);
        reject(new Error('Operation aborted'));
      });

      this.pendingResults.set(callId, result => {
        this.pendingResults.delete(callId);
        resolve(result);
      });
    });
  }

  public sendResult(callId: string, result: string): boolean {
    const resolve = this.pendingResults.get(callId);
    if (!resolve) {
      return false;
    }

    resolve(result);
    return true;
  }
}
