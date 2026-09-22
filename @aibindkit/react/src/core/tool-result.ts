export class ToolWait {
  public constructor(public finishSignal: AbortSignal) {}

  public wait(signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (this.finishSignal.aborted) {
        resolve();
        return;
      }
      if (signal.aborted) {
        reject(new Error('Tool wait aborted'));
        return;
      }

      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error('Tool wait aborted'));
      };
      signal.addEventListener('abort', onAbort);

      this.finishSignal.addEventListener(
        'abort',
        () => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        },
        { once: true }
      );
    });
  }
}

export function toolError(error: string | Error): { error: string } {
  if (typeof error === 'string') {
    return { error };
  }
  return { error: error.message };
}

export function toolSuccess(message: string): { success: string } {
  return { success: message };
}

export function toolWait(finishSignal: AbortSignal) {
  return new ToolWait(finishSignal);
}

export function isToolWait(value: unknown): value is ToolWait {
  return value instanceof ToolWait;
}
