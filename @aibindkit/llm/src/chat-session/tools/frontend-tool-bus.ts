interface ReadyResult {
  result: string;
  consume: () => void;
}

export class FrontendToolBus {
  private readonly readyResults: Map<string, ReadyResult> = new Map();
  private readonly pendingResults: Map<string, (result: string) => void> = new Map();

  // waitForResult

  public async waitForResult(signal: AbortSignal, sessionToken: string, callId: string): Promise<string> {
    const key = this.getKey(sessionToken, callId);
    return this.tryGetReadyResult(key) ?? this.waitForPendingResult(signal, key);
  }

  private tryGetReadyResult(key: string): Promise<string> | null {
    const ready = this.readyResults.get(key);
    if (ready) {
      ready.consume();
      return Promise.resolve(ready.result);
    }
    return null;
  }

  private waitForPendingResult(signal: AbortSignal, key: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (this.pendingResults.has(key)) {
        reject(new Error('Result already being waited for'));
        return;
      }

      const abort = () => {
        this.pendingResults.delete(key);
        reject(new Error('Operation aborted'));
      };

      if (signal.aborted) {
        abort();
        return;
      }

      signal.addEventListener('abort', abort, { once: true });

      this.pendingResults.set(key, result => {
        this.pendingResults.delete(key);
        signal.removeEventListener('abort', abort);
        resolve(result);
      });
    });
  }

  // sendResult

  public async sendResult(
    signal: AbortSignal,
    maxWaitTime: number,
    sessionToken: string,
    callId: string,
    result: string
  ): Promise<boolean> {
    const key = this.getKey(sessionToken, callId);
    return this.trySendPendingResult(key, result) ?? this.sendReadyResult(signal, maxWaitTime, key, result);
  }

  private trySendPendingResult(key: string, result: string): true | null {
    const resolve = this.pendingResults.get(key);
    if (resolve) {
      resolve(result);
      return true;
    }
    return null;
  }

  private sendReadyResult(signal: AbortSignal, maxWaitTime: number, key: string, result: string): Promise<boolean> {
    if (this.readyResults.has(key)) {
      throw new Error('Result already sent for this call');
    }

    const remove = () => this.readyResults.delete(key);

    let consumed = false;
    let finish: (() => void) | null = null;
    const ready: ReadyResult = {
      result,
      consume: () => {
        consumed = true;
        remove();
        finish?.();
      }
    };
    this.readyResults.set(key, ready);

    return new Promise((resolve, reject) => {
      const abort = () => {
        remove();
        reject(new Error('Operation aborted'));
      };

      if (signal.aborted) {
        abort();
        return;
      }
      if (consumed) {
        resolve(true);
        return;
      }

      const to = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        if (!consumed) {
          remove();
          resolve(false);
        }
      }, maxWaitTime);

      finish = () => {
        signal.removeEventListener('abort', abort);
        clearTimeout(to);
        resolve(true);
      };

      signal.addEventListener('abort', abort, { once: true });
    });
  }

  private getKey(sessionToken: string, callId: string): string {
    return `${sessionToken}:${callId}`;
  }
}
